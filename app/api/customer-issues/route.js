import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { customerIssueCreateSchema, parseIssueInput } from '@/lib/validations/customerIssue';
import { getIssuePermissions } from '@/lib/customerIssue/permissions';
import { defaultDueDate } from '@/lib/customerIssue/workflow';
import { KANBAN_BOARD, LOG_ACTION } from '@/lib/customerIssue/constants';
import {
    fail, readJson, loadActor, buildIssueWhere, buildIssueOrderBy, ISSUE_LIST_SELECT,
    writeIssueLog, notifyIssueUsers, findActiveUsers, boardColumnWhere, withOpenWorkOrderCounts,
} from '@/lib/customerIssue/service';

// GET /api/customer-issues — danh sách có phân trang + bộ lọc.
// Dùng chung cho module riêng, tab Khách hàng (?customerId=) và tab Dự án (?projectId=).
// ?view=kanban trả về 4 cột của KANBAN_BOARD; mỗi trạng thái trong cột tối đa ?perColumn=
// (mặc định 50) thẻ, cột nhiều trạng thái xếp theo thứ tự `statuses` (Chờ xác nhận trước).
export const GET = withAuth(async (request, _ctx, session) => {
    const actor = await loadActor(session);
    const { searchParams } = new URL(request.url);
    const where = buildIssueWhere(searchParams, actor);
    const orderBy = buildIssueOrderBy(searchParams);
    const permissions = getIssuePermissions(actor);

    if (searchParams.get('view') === 'kanban') {
        const perColumn = Math.min(200, Math.max(1, parseInt(searchParams.get('perColumn') || '50', 10) || 50));
        const columns = await Promise.all(KANBAN_BOARD.map(async (column) => {
            const parts = await Promise.all(column.statuses.map(async (status) => {
                const colWhere = { AND: [...where.AND, ...boardColumnWhere(column, status)] };
                const [items, total] = await Promise.all([
                    prisma.customerIssue.findMany({ where: colWhere, select: ISSUE_LIST_SELECT, orderBy, take: perColumn }),
                    prisma.customerIssue.count({ where: colWhere }),
                ]);
                return { items, total };
            }));
            return {
                key: column.key,
                label: column.label,
                statuses: column.statuses,
                dropStatus: column.dropStatus,
                total: parts.reduce((sum, p) => sum + p.total, 0),
                items: await withOpenWorkOrderCounts(parts.flatMap(p => p.items)),
            };
        }));
        return NextResponse.json({ columns, permissions });
    }

    const { page, limit, skip } = parsePagination(searchParams);
    const [rows, total] = await Promise.all([
        prisma.customerIssue.findMany({ where, select: ISSUE_LIST_SELECT, orderBy, skip, take: limit }),
        prisma.customerIssue.count({ where }),
    ]);
    const data = await withOpenWorkOrderCounts(rows);
    return NextResponse.json({ ...paginatedResponse(data, total, { page, limit }), permissions });
});

// POST /api/customer-issues — ghi nhận vấn đề mới
export const POST = withAuth(async (request, _ctx, session) => {
    const actor = await loadActor(session);
    const perms = getIssuePermissions(actor);
    if (!perms.create) return fail('Bạn không có quyền ghi nhận vấn đề', 403);

    const parsed = parseIssueInput(customerIssueCreateSchema, await readJson(request));
    if (parsed.error) return NextResponse.json(parsed.error, { status: 400 });
    const input = parsed.data;

    // Khách hàng bắt buộc; dự án (nếu có) phải thuộc đúng khách hàng
    let customerId = input.customerId || null;
    if (input.projectId) {
        const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { customerId: true } });
        if (!project) return fail('Không tìm thấy dự án');
        if (customerId && customerId !== project.customerId) return fail('Dự án không thuộc khách hàng đã chọn');
        customerId = project.customerId;
    }
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) return fail('Không tìm thấy khách hàng');

    let assignee = null;
    if (input.assigneeId) {
        if (!perms.assign) return fail('Bạn không có quyền phân công', 403);
        [assignee] = await findActiveUsers([input.assigneeId]);
        if (!assignee) return fail('Người phụ trách không tồn tại hoặc đã ngừng hoạt động');
    }

    const collaboratorIds = [...new Set(input.collaboratorIds)].filter(uid => uid !== assignee?.id);
    if (collaboratorIds.length && !perms.collaborators) return fail('Bạn không có quyền thêm người phối hợp', 403);
    const collaborators = await findActiveUsers(collaboratorIds);
    if (collaborators.length !== collaboratorIds.length) return fail('Có người phối hợp không tồn tại hoặc đã ngừng hoạt động');

    const reportedAt = input.reportedAt || new Date();

    const issue = await withCodeRetry('customerIssue', 'DH', (code) =>
        prisma.$transaction(async (tx) => {
            const created = await tx.customerIssue.create({
                data: {
                    code,
                    customerId,
                    projectId: input.projectId || null,
                    title: input.title,
                    area: input.area,
                    category: input.category,
                    description: input.description,
                    priority: input.priority,
                    source: input.source,
                    reporterName: input.reporterName,
                    reporterPhone: input.reporterPhone,
                    reportedAt,
                    dueDate: input.dueDate || defaultDueDate(input.priority, reportedAt),
                    assigneeId: assignee?.id || null,
                    assigneeName: assignee?.name || '',
                    createdById: actor.id,
                    createdByName: actor.name,
                    collaborators: {
                        create: collaborators.map(u => ({ userId: u.id, userName: u.name, addedById: actor.id })),
                    },
                },
            });
            await writeIssueLog(tx, created.id, actor, { action: LOG_ACTION.CREATED, toStatus: created.status, message: created.title });
            if (assignee) {
                await writeIssueLog(tx, created.id, actor, { action: LOG_ACTION.ASSIGNED, message: assignee.name, meta: { assigneeId: assignee.id } });
                await notifyIssueUsers(tx, [assignee.id], actor, created, `Bạn được giao phụ trách: ${created.title}`);
            }
            for (const u of collaborators) {
                await writeIssueLog(tx, created.id, actor, { action: LOG_ACTION.COLLABORATOR_ADDED, message: u.name, meta: { userId: u.id } });
            }
            await notifyIssueUsers(tx, collaborators.map(u => u.id), actor, created, `Bạn được thêm phối hợp xử lý: ${created.title}`);
            return created;
        }), 4);

    return NextResponse.json(issue, { status: 201 });
});
