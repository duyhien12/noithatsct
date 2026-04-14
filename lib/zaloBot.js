/**
 * Zalo Bot - AI hiểu câu hỏi tự nhiên của sếp + truy vấn DB
 * Claude Haiku: parse intent + viết phản hồi tự nhiên tiếng Việt
 */
import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/prisma';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Trạng thái dự án đang hoạt động ─────────────────────────────────────────
const ACTIVE_PROJECT_STATUSES = ['Đang thi công', 'Chuẩn bị thi công', 'Thiết kế', 'Khảo sát'];

// ─── Step 1: Parse intent + entities ─────────────────────────────────────────

async function parseIntent(question) {
    const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: `Phân tích câu hỏi tiếng Việt về ERP công ty nội thất/xây dựng.
Trả về JSON (không markdown):
{
  "intent": "tasks_by_person"|"tasks_by_department"|"project_progress"|"overdue_tasks"|"active_projects"|"person_projects"|"work_orders_by_person"|"summary_today"|"unknown",
  "person": "tên riêng của người (null nếu không có — KHÔNG lấy từ thông thường như 'còn','cua','của','thì','là')",
  "department": "tên phòng ban (null nếu không có)",
  "project_code": "mã dự án ĐÚNG FORMAT là DA001, DA016, DA029... (null nếu không có mã DA)",
  "project_name": "tên/từ khóa dự án bất kỳ — ví dụ 'LK19 cô hoa', 'Hiệp Hằng', 'LK 14 Anh Tú' (null nếu không có)"
}

Lưu ý quan trọng về tên người:
- Tên người Việt thường là danh từ riêng: Bình, Vương, Hùng, Linh, Nam, Hà, An, Tuấn...
- "còn công việc của vương" → person: "Vương" (KHÔNG phải "Còn")
- "công việc cua vương" → person: "Vương" ("cua" là lỗi đánh máy của "của")
- "vương đang làm gì" → intent: "tasks_by_person", person: "Vương"
- "bình phòng xây dựng" → intent: "tasks_by_department", department: "xây dựng", person: "Bình"
- "tổng kết/báo cáo hôm nay/sáng nay" → intent: "summary_today"`,
        messages: [{ role: 'user', content: question }],
    });

    const text = msg.content[0]?.text || '{}';
    try {
        return JSON.parse(text);
    } catch {
        const m = text.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : { intent: 'unknown' };
    }
}

// ─── Step 2: DB Queries ───────────────────────────────────────────────────────

async function getTasksByPerson(personName) {
    const [scheduleTasks, kanbanTasks] = await Promise.all([
        // Tác vụ theo dự án (Gantt)
        prisma.scheduleTask.findMany({
            where: {
                assignee: { contains: personName, mode: 'insensitive' },
                progress: { lt: 100 },
                status: { notIn: ['Hoàn thành', 'Đã hủy'] },
            },
            include: { project: { select: { code: true, name: true } } },
            orderBy: { endDate: 'asc' },
            take: 10,
        }),
        // Tác vụ Kanban (/tasks)
        prisma.task.findMany({
            where: {
                OR: [
                    { assignee: { contains: personName, mode: 'insensitive' } },
                    { createdBy: { contains: personName, mode: 'insensitive' } },
                ],
                status: { notIn: ['Hoàn thành', 'Đã hủy'] },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
        }),
    ]);

    // Gộp thành dạng thống nhất
    const combined = [
        ...scheduleTasks.map(t => ({
            name: t.name,
            progress: t.progress,
            status: t.status,
            endDate: t.endDate,
            source: 'Dự án',
            project: t.project,
        })),
        ...kanbanTasks.map(t => ({
            name: t.title,
            progress: t.status === 'Hoàn thành' ? 100 : t.status === 'Đang thực hiện' ? 50 : 0,
            status: t.status,
            endDate: t.dueDate,
            source: 'Tác vụ',
            project: null,
        })),
    ];
    return combined;
}

async function getTasksByDepartment(deptName) {
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
    const tasks = await prisma.scheduleTask.findMany({
        where: {
            OR: names.map((n) => ({ assignee: { contains: n, mode: 'insensitive' } })),
            progress: { lt: 100 },
            status: { notIn: ['Hoàn thành', 'Đã hủy'] },
        },
        include: { project: { select: { code: true, name: true } } },
        orderBy: { endDate: 'asc' },
        take: 20,
    });
    return { employees: names, tasks };
}

async function getProjectProgress(code, name) {
    // Tạo nhiều điều kiện tìm kiếm để bắt được "LK19" → "LK 19 Cô Hoa"
    const conditions = [];
    if (code) {
        conditions.push({ code: { equals: code, mode: 'insensitive' } });
        conditions.push({ code: { contains: code, mode: 'insensitive' } });
    }
    if (name) {
        conditions.push({ name: { contains: name, mode: 'insensitive' } });
        // Tách từng từ trong câu để tìm riêng (LK19 → LK, 19)
        const words = name.split(/[\s\-\.]+/).filter(w => w.length >= 2);
        words.forEach(w => conditions.push({ name: { contains: w, mode: 'insensitive' } }));
    }
    if (!conditions.length) return null;

    return prisma.project.findFirst({
        where: { OR: conditions },
        include: {
            scheduleTasks: {
                where: { parentId: null },
                select: { name: true, progress: true, status: true, assignee: true, endDate: true },
                orderBy: { order: 'asc' },
                take: 10,
            },
        },
        orderBy: { updatedAt: 'desc' },
    });
}

async function getOverdueTasks() {
    return prisma.scheduleTask.findMany({
        where: {
            endDate: { lt: new Date() },
            progress: { lt: 100 },
            status: { notIn: ['Hoàn thành', 'Đã hủy'] },
        },
        include: { project: { select: { code: true, name: true } } },
        orderBy: { endDate: 'asc' },
        take: 15,
    });
}

async function getActiveProjects() {
    return prisma.project.findMany({
        where: { status: { in: ACTIVE_PROJECT_STATUSES } },
        select: { code: true, name: true, progress: true, status: true, address: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
    });
}

async function getPersonProjects(personName) {
    const tasks = await prisma.scheduleTask.findMany({
        where: { assignee: { contains: personName, mode: 'insensitive' } },
        select: { project: { select: { code: true, name: true, status: true, progress: true } } },
        distinct: ['projectId'],
        take: 10,
    });
    return tasks.map((t) => t.project).filter(Boolean);
}

async function getWorkOrdersByPerson(personName) {
    return prisma.workOrder.findMany({
        where: {
            assignee: { contains: personName, mode: 'insensitive' },
            status: { not: 'Hoàn thành' },
            deletedAt: null,
        },
        include: { project: { select: { code: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
    });
}

async function getSummaryToday() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [newReports, overdueCount, activeProjects, inProgressTasks] = await Promise.all([
        prisma.progressReport.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
        prisma.scheduleTask.count({
            where: { endDate: { lt: now }, progress: { lt: 100 }, status: { notIn: ['Hoàn thành', 'Đã hủy'] } },
        }),
        prisma.project.findMany({
            where: { status: { in: ACTIVE_PROJECT_STATUSES } },
            select: { code: true, name: true, progress: true, status: true },
            orderBy: { updatedAt: 'desc' },
            take: 5,
        }),
        prisma.scheduleTask.count({
            where: { status: 'Đang thực hiện', progress: { lt: 100 } },
        }),
    ]);

    return { newReports, overdueCount, activeProjects, inProgressTasks };
}

// ─── Fallback: lấy dữ liệu tổng hợp để Claude trả lời câu hỏi tự do ─────────

async function getCompanySnapshot() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [projects, overdueTasks, todayReports, workOrders] = await Promise.all([
        prisma.project.findMany({
            select: {
                code: true, name: true, progress: true, status: true,
                contractValue: true, address: true,
                scheduleTasks: {
                    where: { parentId: null },
                    select: { name: true, progress: true, assignee: true, endDate: true, status: true },
                    orderBy: { order: 'asc' },
                    take: 5,
                },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.scheduleTask.count({
            where: { endDate: { lt: now }, progress: { lt: 100 }, status: { notIn: ['Hoàn thành', 'Đã hủy'] } },
        }),
        prisma.progressReport.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
        prisma.workOrder.findMany({
            where: { status: { not: 'Hoàn thành' }, deletedAt: null },
            select: { title: true, status: true, priority: true, assignee: true, dueDate: true,
                project: { select: { code: true, name: true } } },
            orderBy: { dueDate: 'asc' },
            take: 15,
        }),
    ]);

    return { projects, overdueTasks, todayReports, workOrders, asOf: now.toISOString() };
}

// ─── Step 3: Claude viết phản hồi tự nhiên ───────────────────────────────────

async function formatWithClaude(dataType, data, context) {
    const dataStr = JSON.stringify(data, null, 2);
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const prompt = `Bạn là trợ lý AI của công ty nội thất SCT, đang báo cáo cho ban giám đốc qua Zalo.
Hôm nay: ${dateStr}

Dữ liệu từ hệ thống (${dataType}):
${dataStr}

Yêu cầu:
- Viết báo cáo bằng tiếng Việt, chuyên nghiệp nhưng thân thiện
- Dùng emoji phù hợp ở đầu mỗi mục
- Nếu không có dữ liệu → nói rõ lý do có thể (chưa được giao, đã hoàn thành,...)
- Giới hạn 300 ký tự nếu dữ liệu ít, tối đa 800 ký tự nếu nhiều
- TUYỆT ĐỐI không dùng markdown: không có **, không có ##, không có __, không có []()
- Ngày tháng hiển thị dạng dd/mm
${context ? `Ngữ cảnh: ${context}` : ''}`;

    const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
    });

    return msg.content[0]?.text || 'Không thể tạo báo cáo.';
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function handleBossMessage(message) {
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('[ZaloBot] ANTHROPIC_API_KEY chưa được cấu hình');
        return 'Lỗi cấu hình: ANTHROPIC_API_KEY chưa được set trong .env';
    }

    let parsed;
    try {
        parsed = await parseIntent(message);
    } catch (err) {
        console.error('[ZaloBot] parseIntent error:', err?.message || err);
        const msg = err?.message || '';
        if (msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('authentication')) {
            return 'Lỗi xác thực API key. Vui lòng kiểm tra ANTHROPIC_API_KEY trong .env';
        }
        if (msg.includes('credit') || msg.includes('billing') || msg.includes('402')) {
            return 'Tài khoản Anthropic hết credits. Vui lòng nạp thêm tại console.anthropic.com';
        }
        return `Lỗi AI: ${msg || 'không xác định'}. Thử lại sau.`;
    }

    console.log('[ZaloBot] Intent:', JSON.stringify(parsed));

    const { intent, person, department, project_code, project_name } = parsed;

    try {
        switch (intent) {
            case 'tasks_by_person': {
                if (!person) return 'Bạn muốn xem công việc của ai? Vui lòng nêu tên cụ thể.';
                const tasks = await getTasksByPerson(person);
                return formatWithClaude('tasks_by_person', { person, tasks }, `Xem công việc của ${person}`);
            }

            case 'tasks_by_department': {
                if (!department) return 'Bạn muốn xem phòng ban nào?';
                const result = await getTasksByDepartment(department);
                return formatWithClaude('tasks_by_department', { department, ...result }, `Xem công việc phòng ${department}`);
            }

            case 'project_progress': {
                // Nếu code không đúng format DA001-DA999, coi là tên dự án
                const isRealCode = /^DA\d+$/i.test(project_code || '');
                const searchCode = isRealCode ? project_code : null;
                const searchName = project_name || (!isRealCode ? project_code : null);
                const project = await getProjectProgress(searchCode, searchName);
                if (!project) return `Không tìm thấy dự án "${project_code || project_name}".`;
                return formatWithClaude('project_progress', project, `Tiến độ dự án ${project.code}`);
            }

            case 'overdue_tasks': {
                const tasks = await getOverdueTasks();
                return formatWithClaude('overdue_tasks', { tasks }, 'Danh sách công việc quá hạn');
            }

            case 'active_projects': {
                const projects = await getActiveProjects();
                return formatWithClaude('active_projects', { projects }, 'Dự án đang hoạt động');
            }

            case 'person_projects': {
                if (!person) return 'Vui lòng nêu tên người cụ thể.';
                const projects = await getPersonProjects(person);
                return formatWithClaude('person_projects', { person, projects }, `Dự án của ${person}`);
            }

            case 'work_orders_by_person': {
                if (!person) return 'Vui lòng nêu tên người cụ thể.';
                const orders = await getWorkOrdersByPerson(person);
                return formatWithClaude('work_orders_by_person', { person, orders }, `Việc lệnh của ${person}`);
            }

            case 'summary_today': {
                const data = await getSummaryToday();
                return formatWithClaude('summary_today', data, 'Tổng kết ngày hôm nay');
            }

            default: {
                // Câu hỏi tự do — lấy snapshot toàn công ty và để Claude trả lời
                const snapshot = await getCompanySnapshot();
                const now = new Date();
                const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

                const msg = await client.messages.create({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 800,
                    system: `Bạn là trợ lý AI của công ty Kiến Trúc Đô Thị SCT (nội thất & xây dựng), đang trả lời ban giám đốc qua Zalo. Hôm nay: ${dateStr}.

Dữ liệu hệ thống:
${JSON.stringify(snapshot, null, 2)}

Quy tắc trả lời:
- Tiếng Việt, chuyên nghiệp, thân thiện
- Dùng emoji phù hợp, TUYỆT ĐỐI không dùng markdown: không có **, không có ##, không có __
- Tối đa 800 ký tự
- Nếu câu hỏi nằm ngoài dữ liệu có sẵn, nói rõ và gợi ý câu hỏi phù hợp
- Ngày tháng dạng dd/mm/yyyy`,
                    messages: [{ role: 'user', content: message }],
                });

                return msg.content[0]?.text || 'Xin lỗi, tôi chưa hiểu câu hỏi này.';
            }
        }
    } catch (err) {
        console.error('[ZaloBot] error:', err);
        return 'Có lỗi khi truy vấn dữ liệu. Vui lòng thử lại.';
    }
}

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
