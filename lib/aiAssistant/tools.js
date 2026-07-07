import prisma from '@/lib/prisma';
import { canCreateTask, canCreateReport } from './permissions';

const ACTIVE_STATUSES = ['Khảo sát', 'Thiết kế', 'Chuẩn bị thi công', 'Đang thi công', 'Thi công'];

async function resolveProject(ref) {
    if (!ref) return null;
    const byId = await prisma.project.findUnique({ where: { id: ref } }).catch(() => null);
    if (byId) return byId;
    return prisma.project.findFirst({
        where: {
            OR: [
                { code: { equals: ref, mode: 'insensitive' } },
                { code: { contains: ref, mode: 'insensitive' } },
                { name: { contains: ref, mode: 'insensitive' } },
            ],
        },
        orderBy: { updatedAt: 'desc' },
    });
}

async function getProjectSummary(input, ctx) {
    if (ctx.scope === 'finance') {
        const projects = await prisma.project.findMany({
            where: { status: { in: ACTIVE_STATUSES } },
            select: { contractValue: true, paidAmount: true, budget: true, spent: true },
        });
        const congNo = projects.reduce((s, p) => s + (p.contractValue - p.paidAmount), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [chiThangNay, congNoQuaHan] = await Promise.all([
            prisma.projectExpense.aggregate({ _sum: { paidAmount: true }, where: { date: { gte: monthStart }, deletedAt: null } }),
            prisma.contractPayment.count({ where: { status: 'Chưa thu', dueDate: { lt: now } } }),
        ]);
        return {
            soDuAnDangHoatDong: projects.length,
            tongCongNo: congNo,
            chiPhiThangNay: chiThangNay._sum.paidAmount || 0,
            soDotThanhToanQuaHan: congNoQuaHan,
        };
    }
    if (ctx.scope === 'sales') {
        const [customersByStage, projectsByStatus] = await Promise.all([
            prisma.customer.groupBy({ by: ['pipelineStage'], _count: true, where: { deletedAt: null } }),
            prisma.project.groupBy({ by: ['status'], _count: true }),
        ]);
        return { khachHangTheoPipeline: customersByStage, duAnTheoTrangThai: projectsByStatus };
    }
    if (ctx.scope === 'production') {
        const [workOrdersByStatus, activeProjects] = await Promise.all([
            prisma.workOrder.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
            prisma.project.count({ where: { status: { in: ['Đang thi công', 'Chuẩn bị thi công'] } } }),
        ]);
        return { phieuViecTheoTrangThai: workOrdersByStatus, soDuAnDangSanXuat: activeProjects };
    }
    if (ctx.scope === 'all') {
        const [projectsByStatus, congNoAgg, workOrdersOpen, expensesPending] = await Promise.all([
            prisma.project.groupBy({ by: ['status'], _count: true }),
            prisma.project.aggregate({ _sum: { contractValue: true, paidAmount: true } }),
            prisma.workOrder.count({ where: { status: { not: 'Hoàn thành' }, deletedAt: null } }),
            prisma.projectExpense.count({ where: { status: 'Chờ duyệt', deletedAt: null } }),
        ]);
        return {
            duAnTheoTrangThai: projectsByStatus,
            tongGiaTriHopDong: congNoAgg._sum.contractValue || 0,
            tongDaThu: congNoAgg._sum.paidAmount || 0,
            phieuViecDangMo: workOrdersOpen,
            chiPhiChoDuyet: expensesPending,
        };
    }
    // general
    const projectsByStatus = await prisma.project.groupBy({ by: ['status'], _count: true });
    return { duAnTheoTrangThai: projectsByStatus };
}

async function searchProjects(input) {
    const query = (input?.query || '').trim();
    if (!query) return { projects: [] };
    const projects = await prisma.project.findMany({
        where: {
            OR: [
                { code: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
                { address: { contains: query, mode: 'insensitive' } },
            ],
        },
        select: { id: true, code: true, name: true, status: true, progress: true, address: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
    });
    return { projects };
}

async function getProjectDetail(input, ctx) {
    const project = await resolveProject(input?.projectId);
    if (!project) return { error: `Không tìm thấy dự án "${input?.projectId || ''}"` };

    const base = {
        id: project.id, code: project.code, name: project.name, type: project.type,
        status: project.status, progress: project.progress, address: project.address,
        startDate: project.startDate, endDate: project.endDate, manager: project.manager,
    };
    if (ctx.scope === 'general') return base;

    if (ctx.scope === 'finance' || ctx.scope === 'all') {
        const [contracts, expenses] = await Promise.all([
            prisma.contract.findMany({ where: { projectId: project.id }, include: { payments: true } }),
            prisma.projectExpense.findMany({ where: { projectId: project.id, deletedAt: null }, orderBy: { date: 'desc' }, take: 20 }),
        ]);
        base.taiChinh = {
            giaTriHopDong: project.contractValue, daThu: project.paidAmount,
            congNo: (project.contractValue || 0) - (project.paidAmount || 0),
            ngansach: project.budget, daChi: project.spent, ngansachDuTru: project.budgetTotal,
            hopDong: contracts.map(c => ({
                code: c.code, giaTriHopDong: c.contractValue, daThu: c.paidAmount, trangThai: c.status,
                dotThanhToan: c.payments.map(p => ({ giaiDoan: p.phase, soTien: p.amount, daThu: p.paidAmount, trangThai: p.status, hanThu: p.dueDate })),
            })),
            chiPhi: expenses.map(e => ({ ma: e.code, moTa: e.description, soTien: e.amount, daChi: e.paidAmount, trangThai: e.status, ngay: e.date })),
        };
    }
    if (ctx.scope === 'sales' || ctx.scope === 'all') {
        const [customer, quotations] = await Promise.all([
            prisma.customer.findUnique({ where: { id: project.customerId } }),
            prisma.quotation.findMany({ where: { projectId: project.id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5 }),
        ]);
        base.kinhDoanh = {
            khachHang: customer ? {
                ten: customer.name, sdt: customer.phone, pipeline: customer.pipelineStage,
                salesPerson: customer.salesPerson, nextFollowUp: customer.nextFollowUp,
            } : null,
            baoGia: quotations.map(q => ({ ma: q.code, tongTien: q.grandTotal, trangThai: q.status })),
        };
    }
    if (ctx.scope === 'production' || ctx.scope === 'all') {
        const [workOrders, scheduleTasks] = await Promise.all([
            prisma.workOrder.findMany({ where: { projectId: project.id, deletedAt: null }, orderBy: { dueDate: 'asc' }, take: 10 }),
            prisma.scheduleTask.findMany({
                where: { projectId: project.id, parentId: null }, orderBy: { order: 'asc' }, take: 10,
                select: { name: true, progress: true, status: true, assignee: true, endDate: true },
            }),
        ]);
        base.sanXuat = {
            phieuViec: workOrders.map(w => ({ ma: w.code, tieuDe: w.title, trangThai: w.status, uuTien: w.priority, nguoiPhuTrach: w.assignee, hanHoanThanh: w.dueDate })),
            tacVuTienDo: scheduleTasks,
        };
    }
    return base;
}

async function suggestNextActions(input, ctx) {
    const project = await resolveProject(input?.projectId);
    if (!project) return { error: `Không tìm thấy dự án "${input?.projectId || ''}"` };
    const now = new Date();
    const suggestions = [];

    if (ctx.scope === 'finance' || ctx.scope === 'all') {
        const overduePayments = await prisma.contractPayment.findMany({
            where: { status: 'Chưa thu', dueDate: { lt: now }, contract: { projectId: project.id } },
            select: { phase: true, amount: true, dueDate: true },
        });
        overduePayments.forEach(p => suggestions.push(`Nhắc thu đợt "${p.phase}" (${p.amount.toLocaleString('vi-VN')}đ) đã quá hạn ${p.dueDate.toLocaleDateString('vi-VN')}`));
    }
    if (ctx.scope === 'sales' || ctx.scope === 'all') {
        const customer = await prisma.customer.findUnique({ where: { id: project.customerId } });
        if (customer && (!customer.nextFollowUp || customer.nextFollowUp < now)) {
            suggestions.push(`Cần follow-up khách hàng "${customer.name}" — chưa có lịch chăm sóc tiếp theo`);
        }
    }
    if (ctx.scope === 'production' || ctx.scope === 'all') {
        const [overdueTasks, overdueOrders] = await Promise.all([
            prisma.scheduleTask.findMany({
                where: { projectId: project.id, endDate: { lt: now }, progress: { lt: 100 }, status: { notIn: ['Hoàn thành', 'Đã hủy'] } },
                select: { name: true, endDate: true }, take: 5,
            }),
            prisma.workOrder.findMany({
                where: { projectId: project.id, dueDate: { lt: now }, status: { not: 'Hoàn thành' }, deletedAt: null },
                select: { title: true, dueDate: true }, take: 5,
            }),
        ]);
        overdueTasks.forEach(t => suggestions.push(`Tác vụ tiến độ "${t.name}" đã trễ hạn ${t.endDate.toLocaleDateString('vi-VN')}`));
        overdueOrders.forEach(o => suggestions.push(`Phiếu việc "${o.title}" đã trễ hạn ${o.dueDate.toLocaleDateString('vi-VN')}`));
    }
    if (suggestions.length === 0) suggestions.push('Không có việc cần xử lý gấp trong phạm vi bạn được xem.');
    return { project: { code: project.code, name: project.name }, suggestions };
}

async function checkProjectRisks(input, ctx) {
    const now = new Date();
    const risks = [];

    if (ctx.scope === 'finance' || ctx.scope === 'all') {
        const [overduePayments, overBudget] = await Promise.all([
            prisma.contractPayment.findMany({
                where: { status: 'Chưa thu', dueDate: { lt: now } },
                include: { contract: { include: { project: { select: { code: true, name: true } } } } },
                take: 10,
            }),
            prisma.project.findMany({
                where: { budget: { gt: 0 }, status: { in: ACTIVE_STATUSES } },
                select: { code: true, name: true, budget: true, spent: true },
            }),
        ]);
        overduePayments.forEach(p => risks.push({
            loai: 'Công nợ quá hạn', duAn: p.contract?.project?.code || '', chiTiet: `Đợt "${p.phase}" quá hạn thu ${p.dueDate.toLocaleDateString('vi-VN')}`,
        }));
        overBudget.filter(p => p.spent > p.budget).forEach(p => risks.push({
            loai: 'Vượt ngân sách', duAn: p.code, chiTiet: `Đã chi ${p.spent.toLocaleString('vi-VN')}đ / ngân sách ${p.budget.toLocaleString('vi-VN')}đ`,
        }));
    }
    if (ctx.scope === 'sales' || ctx.scope === 'all') {
        const staleCustomers = await prisma.customer.findMany({
            where: { deletedAt: null, pipelineStage: { notIn: ['Ký HĐ', 'Thi công'] }, OR: [{ nextFollowUp: null }, { nextFollowUp: { lt: now } }] },
            select: { code: true, name: true, pipelineStage: true },
            take: 10,
        });
        staleCustomers.forEach(c => risks.push({ loai: 'Khách hàng chưa follow-up', duAn: c.code, chiTiet: `${c.name} (${c.pipelineStage}) chưa có lịch chăm sóc tiếp theo` }));
    }
    if (ctx.scope === 'production' || ctx.scope === 'all') {
        const [overdueTasks, overdueOrders] = await Promise.all([
            prisma.scheduleTask.findMany({
                where: { endDate: { lt: now }, progress: { lt: 100 }, status: { notIn: ['Hoàn thành', 'Đã hủy'] } },
                include: { project: { select: { code: true, name: true } } }, take: 10,
            }),
            prisma.workOrder.findMany({
                where: { dueDate: { lt: now }, status: { not: 'Hoàn thành' }, deletedAt: null },
                include: { project: { select: { code: true, name: true } } }, take: 10,
            }),
        ]);
        overdueTasks.forEach(t => risks.push({ loai: 'Tiến độ trễ hạn', duAn: t.project?.code || '', chiTiet: `Tác vụ "${t.name}" trễ ${t.endDate.toLocaleDateString('vi-VN')}` }));
        overdueOrders.forEach(o => risks.push({ loai: 'Phiếu việc trễ hạn', duAn: o.project?.code || '', chiTiet: `"${o.title}" trễ ${o.dueDate.toLocaleDateString('vi-VN')}` }));
    }
    if (risks.length === 0) risks.push({ loai: 'Không có rủi ro', duAn: '', chiTiet: 'Không phát hiện rủi ro nào trong phạm vi bạn được xem.' });
    return { risks };
}

async function createTaskDraft(input, ctx) {
    if (!canCreateTask(ctx.scope)) {
        return { error: 'Bạn không có quyền tạo tác vụ. Chỉ Ban giám đốc, Kinh doanh và Xưởng mới được tạo tác vụ qua trợ lý AI.' };
    }
    const content = (input?.content || '').trim();
    if (!content) return { error: 'Thiếu nội dung tác vụ.' };
    const project = input?.projectId ? await resolveProject(input.projectId) : null;
    return {
        kind: 'task',
        title: content,
        projectRef: project ? { id: project.id, code: project.code, name: project.name } : null,
        priority: 'Trung bình',
        status: 'Việc sẽ làm',
        previewText: `Tạo tác vụ: "${content}"${project ? ` (liên quan dự án ${project.code} - ${project.name})` : ''}`,
    };
}

async function createReportDraft(input, ctx) {
    const type = input?.type || ctx.scope;
    if (!canCreateReport(ctx.scope, type)) {
        return { error: `Bạn không có quyền tạo báo cáo loại "${type}".` };
    }
    const summary = await getProjectSummary({}, { ...ctx, scope: type === 'general' ? 'general' : type });
    const lines = Object.entries(summary).map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    const content = `Báo cáo ${type} — tạo lúc ${new Date().toLocaleString('vi-VN')}\n${lines.join('\n')}`;
    return { kind: 'report', type, content, previewText: `Tạo báo cáo "${type}"` };
}

export const TOOL_REGISTRY = [
    {
        name: 'getProjectSummary',
        description: 'Lấy số liệu tổng quan toàn công ty (dự án, tài chính, khách hàng, sản xuất) tùy theo quyền của người hỏi. Dùng khi người dùng hỏi tổng quan/tóm tắt chung, không hỏi về 1 dự án cụ thể.',
        input_schema: { type: 'object', properties: {}, additionalProperties: false },
        handler: getProjectSummary,
    },
    {
        name: 'searchProjects',
        description: 'Tìm dự án theo mã, tên hoặc địa chỉ (chứa từ khóa). Dùng để tìm projectId trước khi gọi getProjectDetail/suggestNextActions/createTaskDraft.',
        input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Từ khóa: mã dự án (DA001), tên hoặc địa chỉ' } }, required: ['query'], additionalProperties: false },
        handler: searchProjects,
    },
    {
        name: 'getProjectDetail',
        description: 'Lấy chi tiết 1 dự án (trạng thái, tiến độ, và tùy quyền: tài chính/khách hàng/sản xuất). projectId có thể là id, mã (DA001) hoặc tên dự án.',
        input_schema: { type: 'object', properties: { projectId: { type: 'string', description: 'id, mã hoặc tên dự án' } }, required: ['projectId'], additionalProperties: false },
        handler: getProjectDetail,
    },
    {
        name: 'suggestNextActions',
        description: 'Gợi ý các việc cần làm tiếp theo cho 1 dự án cụ thể (thanh toán quá hạn, follow-up khách hàng, tiến độ trễ...) tùy theo quyền của người hỏi.',
        input_schema: { type: 'object', properties: { projectId: { type: 'string', description: 'id, mã hoặc tên dự án' } }, required: ['projectId'], additionalProperties: false },
        handler: suggestNextActions,
    },
    {
        name: 'checkProjectRisks',
        description: 'Quét rủi ro trên toàn bộ dự án (công nợ quá hạn, vượt ngân sách, khách hàng chưa follow-up, tiến độ/phiếu việc trễ hạn) tùy theo quyền của người hỏi.',
        input_schema: { type: 'object', properties: {}, additionalProperties: false },
        handler: checkProjectRisks,
    },
    {
        name: 'createTaskDraft',
        description: 'Tạo BẢN NHÁP một tác vụ (task) — KHÔNG lưu vào hệ thống. Chỉ trả về bản nháp để người dùng xác nhận. Dùng khi người dùng yêu cầu "tạo tác vụ", "nhắc việc", "giao việc".',
        input_schema: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Nội dung/tiêu đề tác vụ' },
                projectId: { type: 'string', description: 'id, mã hoặc tên dự án liên quan (nếu có)' },
            },
            required: ['content'], additionalProperties: false,
        },
        handler: createTaskDraft,
    },
    {
        name: 'createReportDraft',
        description: 'Tạo BẢN NHÁP nội dung báo cáo tổng hợp (finance/sales/production/general) — KHÔNG lưu vào hệ thống. Chỉ trả về bản nháp để người dùng xác nhận.',
        input_schema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['finance', 'sales', 'production', 'general'], description: 'Loại báo cáo' },
                filters: { type: 'object', description: 'Bộ lọc tùy chọn (hiện chưa dùng, để mở rộng sau)' },
            },
            required: ['type'], additionalProperties: false,
        },
        handler: createReportDraft,
    },
];

export function getToolsForNames(names) {
    return TOOL_REGISTRY.filter(t => names.includes(t.name));
}

export async function dispatchTool(name, input, ctx) {
    const tool = TOOL_REGISTRY.find(t => t.name === name);
    if (!tool) return { error: `Không có công cụ "${name}"` };
    try {
        return await tool.handler(input, ctx);
    } catch (err) {
        console.error(`[AI tool ${name}]`, err);
        return { error: 'Lỗi truy vấn dữ liệu.' };
    }
}
