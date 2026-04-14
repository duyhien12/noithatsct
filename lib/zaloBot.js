/**
 * Zalo Bot - AI hiểu câu hỏi tự nhiên của sếp + truy vấn DB
 * Dùng Google Gemini (đã có sẵn trong project)
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';

// ─── Gemini NLU ───────────────────────────────────────────────────────────────

const PARSE_PROMPT = `Bạn là trợ lý phân tích câu hỏi cho hệ thống ERP nội thất/xây dựng.
Phân tích câu hỏi tiếng Việt và trả về JSON duy nhất (không markdown):

{
  "intent": "tasks_by_person" | "tasks_by_department" | "project_progress" | "overdue_tasks" | "active_projects" | "person_projects" | "work_orders_by_person" | "summary_today" | "unknown",
  "person": "tên người (null nếu không đề cập)",
  "department": "tên phòng ban (null nếu không đề cập)",
  "project_code": "mã dự án viết hoa như SCT-01 (null nếu không rõ)",
  "project_name": "tên/từ khóa dự án (null nếu không rõ)"
}

Quy tắc:
- "Bình đang làm gì" → intent: tasks_by_person, person: "Bình"
- "phòng xây dựng đang làm gì" → intent: tasks_by_department, department: "xây dựng"
- "tiến độ SCT-01" → intent: project_progress, project_code: "SCT-01"
- "công việc quá hạn / trễ deadline" → intent: overdue_tasks
- "các dự án đang làm / đang triển khai" → intent: active_projects
- "Bình đang ở dự án nào" → intent: person_projects, person: "Bình"
- "việc lệnh / work order của Bình" → intent: work_orders_by_person, person: "Bình"
- "tổng kết hôm nay / báo cáo hôm nay" → intent: summary_today

Chỉ trả JSON thuần, KHÔNG giải thích thêm.`;

async function parseIntent(question) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY chưa được cấu hình');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: question }] }],
        systemInstruction: { parts: [{ text: PARSE_PROMPT }] },
        generationConfig: { temperature: 0.1, maxOutputTokens: 512, responseMimeType: 'application/json' },
    });

    const text = result.response.text();
    try {
        return JSON.parse(text);
    } catch {
        const m = text.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : { intent: 'unknown' };
    }
}

// ─── DB Queries ───────────────────────────────────────────────────────────────

async function getTasksByPerson(personName) {
    const tasks = await prisma.scheduleTask.findMany({
        where: {
            assignee: { contains: personName, mode: 'insensitive' },
            progress: { lt: 100 },
        },
        include: { project: { select: { code: true, name: true } } },
        orderBy: { endDate: 'asc' },
        take: 15,
    });
    return tasks;
}

async function getTasksByDepartment(deptName) {
    // Lấy nhân viên trong phòng ban
    const employees = await prisma.employee.findMany({
        where: {
            department: { name: { contains: deptName, mode: 'insensitive' } },
            status: 'Đang làm',
            deletedAt: null,
        },
        select: { name: true },
    });
    if (!employees.length) return { employees: [], tasks: [] };

    const names = employees.map((e) => e.name);

    // Lấy task của từng người
    const tasks = await prisma.scheduleTask.findMany({
        where: {
            OR: names.map((n) => ({ assignee: { contains: n, mode: 'insensitive' } })),
            progress: { lt: 100 },
        },
        include: { project: { select: { code: true, name: true } } },
        orderBy: { endDate: 'asc' },
        take: 20,
    });

    return { employees: names, tasks };
}

async function getProjectProgress(code, name) {
    const project = await prisma.project.findFirst({
        where: {
            OR: [
                code ? { code: { equals: code, mode: 'insensitive' } } : undefined,
                name ? { name: { contains: name, mode: 'insensitive' } } : undefined,
            ].filter(Boolean),
        },
        include: {
            scheduleTasks: {
                where: { parentId: null }, // chỉ task gốc
                select: { name: true, progress: true, status: true, assignee: true, endDate: true },
                orderBy: { order: 'asc' },
                take: 10,
            },
        },
    });
    return project;
}

async function getOverdueTasks() {
    const now = new Date();
    const tasks = await prisma.scheduleTask.findMany({
        where: {
            endDate: { lt: now },
            progress: { lt: 100 },
            status: { not: 'Hoàn thành' },
        },
        include: { project: { select: { code: true, name: true } } },
        orderBy: { endDate: 'asc' },
        take: 15,
    });
    return tasks;
}

async function getActiveProjects() {
    const projects = await prisma.project.findMany({
        where: { status: { in: ['Đang thực hiện', 'Thi công'] } },
        select: { code: true, name: true, progress: true, status: true, address: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
    });
    return projects;
}

async function getPersonProjects(personName) {
    const tasks = await prisma.scheduleTask.findMany({
        where: { assignee: { contains: personName, mode: 'insensitive' } },
        select: { project: { select: { code: true, name: true, status: true, progress: true } } },
        distinct: ['projectId'],
        take: 10,
    });
    return tasks.map((t) => t.project);
}

async function getWorkOrdersByPerson(personName) {
    const orders = await prisma.workOrder.findMany({
        where: {
            assignee: { contains: personName, mode: 'insensitive' },
            status: { not: 'Hoàn thành' },
            deletedAt: null,
        },
        include: { project: { select: { code: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
    });
    return orders;
}

async function getSummaryToday() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [newReports, overdueCount, activeProjects] = await Promise.all([
        prisma.progressReport.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
        prisma.scheduleTask.count({ where: { endDate: { lt: now }, progress: { lt: 100 } } }),
        prisma.project.count({ where: { status: { in: ['Đang thực hiện', 'Thi công'] } } }),
    ]);

    return { newReports, overdueCount, activeProjects };
}

// ─── Format Responses ─────────────────────────────────────────────────────────

function fmtDate(d) {
    if (!d) return '?';
    const date = new Date(d);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatTasksResponse(tasks, header) {
    if (!tasks.length) return `${header}\n\nKhông có công việc nào.`;

    const lines = tasks.map((t) => {
        const proj = t.project ? `[${t.project.code}]` : '';
        const deadline = `Hạn: ${fmtDate(t.endDate)}`;
        const pct = `${t.progress}%`;
        const status = t.status !== 'Đang thực hiện' ? ` (${t.status})` : '';
        return `• ${proj} ${t.name} — ${pct}${status}, ${deadline}`;
    });

    return `${header}\n\n${lines.join('\n')}`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

/**
 * Xử lý tin nhắn từ sếp, trả về text trả lời
 * @param {string} message - Câu hỏi của sếp
 * @returns {Promise<string>} - Câu trả lời để gửi về Zalo
 */
export async function handleBossMessage(message) {
    let parsed;
    try {
        parsed = await parseIntent(message);
    } catch (err) {
        console.error('[ZaloBot] parseIntent error:', err);
        return 'Xin lỗi, hệ thống AI đang có sự cố. Vui lòng thử lại sau.';
    }

    const { intent, person, department, project_code, project_name } = parsed;

    try {
        switch (intent) {
            case 'tasks_by_person': {
                if (!person) return 'Bạn muốn xem công việc của ai? Vui lòng nêu tên cụ thể.';
                const tasks = await getTasksByPerson(person);
                return formatTasksResponse(tasks, `📋 Công việc đang làm của ${person}:`);
            }

            case 'tasks_by_department': {
                if (!department) return 'Bạn muốn xem phòng ban nào? Vui lòng nêu cụ thể.';
                const { employees, tasks } = await getTasksByDepartment(department);
                if (!employees.length)
                    return `Không tìm thấy phòng ban "${department}" hoặc phòng chưa có nhân viên.`;
                return formatTasksResponse(tasks, `📋 Công việc phòng ${department} (${employees.length} người):`);
            }

            case 'project_progress': {
                const project = await getProjectProgress(project_code, project_name);
                if (!project) return `Không tìm thấy dự án "${project_code || project_name}".`;
                const header = `📊 Dự án ${project.code} — ${project.name}\nTiến độ: ${project.progress}% | ${project.status}`;
                if (!project.scheduleTasks?.length) return header;
                const taskLines = project.scheduleTasks.map(
                    (t) => `• ${t.name}: ${t.progress}% (${t.assignee || 'chưa giao'})`
                );
                return `${header}\n\nHạng mục:\n${taskLines.join('\n')}`;
            }

            case 'overdue_tasks': {
                const tasks = await getOverdueTasks();
                return formatTasksResponse(tasks, '⚠️ Công việc quá hạn:');
            }

            case 'active_projects': {
                const projects = await getActiveProjects();
                if (!projects.length) return 'Hiện không có dự án nào đang thực hiện.';
                const lines = projects.map(
                    (p) => `• [${p.code}] ${p.name} — ${p.progress}% (${p.status})`
                );
                return `🏗️ Dự án đang thực hiện (${projects.length}):\n\n${lines.join('\n')}`;
            }

            case 'person_projects': {
                if (!person) return 'Vui lòng nêu tên người cụ thể.';
                const projects = await getPersonProjects(person);
                if (!projects.length) return `${person} chưa được giao dự án nào.`;
                const lines = projects.map((p) => `• [${p.code}] ${p.name} — ${p.progress}% (${p.status})`);
                return `🏗️ Dự án của ${person}:\n\n${lines.join('\n')}`;
            }

            case 'work_orders_by_person': {
                if (!person) return 'Vui lòng nêu tên người cụ thể.';
                const orders = await getWorkOrdersByPerson(person);
                if (!orders.length) return `${person} không có việc lệnh nào đang mở.`;
                const lines = orders.map((o) => {
                    const proj = o.project ? `[${o.project.code}]` : '';
                    const due = o.dueDate ? `Hạn: ${fmtDate(o.dueDate)}` : '';
                    return `• ${proj} ${o.title} (${o.status}) ${due}`;
                });
                return `📋 Việc lệnh của ${person}:\n\n${lines.join('\n')}`;
            }

            case 'summary_today': {
                const s = await getSummaryToday();
                return `📈 Tổng kết hôm nay:\n• Báo cáo tiến độ mới: ${s.newReports}\n• Công việc quá hạn: ${s.overdueCount}\n• Dự án đang thi công: ${s.activeProjects}`;
            }

            default:
                return (
                    'Tôi chưa hiểu câu hỏi. Bạn có thể hỏi:\n' +
                    '• "Bình đang làm gì?"\n' +
                    '• "Phòng xây dựng đang làm gì?"\n' +
                    '• "Tiến độ dự án SCT-01?"\n' +
                    '• "Công việc nào quá hạn?"\n' +
                    '• "Các dự án đang thi công?"'
                );
        }
    } catch (err) {
        console.error('[ZaloBot] DB query error:', err);
        return 'Có lỗi khi truy vấn dữ liệu. Vui lòng thử lại.';
    }
}

/**
 * Kiểm tra người gửi có phải sếp không (theo zaloUserId trong bảng User)
 * @param {string} senderZaloId
 */
export async function isBoss(senderZaloId) {
    if (!senderZaloId) return false;
    const user = await prisma.user.findFirst({
        where: {
            zaloUserId: senderZaloId,
            role: { in: ['giam_doc', 'pho_gd', 'ban_gd'] },
            active: true,
        },
    });
    return !!user;
}
