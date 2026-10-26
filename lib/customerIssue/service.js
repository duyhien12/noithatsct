// Đồng hành 360 — hàm dùng chung phía server cho các API route.
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getIssuePermissions, getIssuePermissionsFor } from './permissions';
import {
    ISSUE_STATUS, OPEN_STATUSES, ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_CATEGORIES, LOG_ACTION, ISSUE_STATUS_LABELS,
    WORK_ORDER_DONE_STATUS,
} from './constants';
import { appendResolution, shouldAwaitConfirmation, transitionFields } from './workflow';

export function fail(error, status = 400, details) {
    return NextResponse.json(details ? { error, details } : { error }, { status });
}

export async function readJson(request) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

/**
 * Người dùng hiện tại, với phòng ban/chức danh đọc lại từ DB (token di động không có
 * department). Giữ role của session vì có thể là role đã chuyển hợp lệ (allowedRoles).
 */
export async function loadActor(session) {
    const u = session?.user || {};
    const db = u.id
        ? await prisma.user.findUnique({ where: { id: u.id }, select: { name: true, role: true, department: true, active: true } })
        : null;
    return {
        id: u.id || '',
        name: u.name || db?.name || '',
        email: u.email || '',
        role: u.role || db?.role || '',
        department: db?.department ?? u.department ?? '',
        active: db ? db.active : true,
    };
}

export const ISSUE_LIST_SELECT = {
    id: true, code: true, title: true, area: true, category: true, description: true,
    priority: true, status: true, source: true, reportedAt: true, dueDate: true,
    assigneeId: true, assigneeName: true, lastActivityAt: true, createdAt: true, updatedAt: true,
    customerId: true, projectId: true,
    customer: { select: { id: true, code: true, name: true, phone: true } },
    project: { select: { id: true, code: true, name: true } },
    collaborators: { select: { userId: true, userName: true } },
    _count: { select: { attachments: { where: { deletedAt: null } }, workOrders: { where: { deletedAt: null } } } },
};

export const ISSUE_DETAIL_INCLUDE = {
    customer: { select: { id: true, code: true, name: true, phone: true, address: true } },
    project: { select: { id: true, code: true, name: true, address: true } },
    collaborators: { orderBy: { createdAt: 'asc' } },
    attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
    workOrders: {
        where: { deletedAt: null },
        select: { id: true, code: true, title: true, status: true, priority: true, assignee: true, dueDate: true, completedAt: true },
        orderBy: { createdAt: 'asc' },
    },
};

/**
 * Tải vấn đề và kiểm tra quyền `key` của actor trên vấn đề đó.
 * @returns {Promise<{ issue, perms } | { response }>}
 */
export async function loadIssueFor(id, actor, key = 'view', include = ISSUE_DETAIL_INCLUDE) {
    const issue = await prisma.customerIssue.findUnique({
        where: { id },
        include: { ...include, collaborators: include.collaborators || { select: { userId: true } } },
    });
    if (!issue) return { response: fail('Không tìm thấy vấn đề', 404) };
    const perms = getIssuePermissionsFor(actor, issue);
    if (!perms.view) return { response: fail('Không tìm thấy vấn đề', 404) };
    if (!perms[key]) return { response: fail('Bạn không có quyền thực hiện thao tác này', 403) };
    return { issue, perms };
}

/** Ghi nhật ký (chỉ thêm) + cập nhật "Cập nhật gần nhất". Gọi bên trong transaction. */
export async function writeIssueLog(tx, issueId, actor, { action, fromStatus = '', toStatus = '', message = '', meta } = {}) {
    const now = new Date();
    await tx.customerIssue.update({ where: { id: issueId }, data: { lastActivityAt: now } });
    return tx.customerIssueLog.create({
        data: {
            issueId,
            action,
            fromStatus,
            toStatus,
            message,
            meta: meta ? JSON.stringify(meta) : '',
            actorId: actor?.id || '',
            actorName: actor?.name || '',
            createdAt: now,
        },
    });
}

/** Thông báo trong app (bảng Notification có sẵn) — bỏ qua chính người thao tác. */
export async function notifyIssueUsers(tx, userIds, actor, issue, message) {
    const ids = [...new Set((userIds || []).filter(u => u && u !== actor?.id))];
    if (!ids.length) return;
    await tx.notification.createMany({
        data: ids.map(userId => ({
            userId,
            type: 'customer_issue',
            message: `[${issue.code}] ${message}`,
            link: `/dong-hanh-360?issue=${issue.id}`,
            actorName: actor?.name || '',
            actorUserId: actor?.id || '',
        })),
    });
}

/** Tài khoản đang hoạt động theo id (để phân công / thêm phối hợp). */
export async function findActiveUsers(ids) {
    if (!ids?.length) return [];
    return prisma.user.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, name: true } });
}

function splitParam(searchParams, key, allowed) {
    const raw = searchParams.get(key);
    if (!raw) return null;
    const values = raw.split(',').map(v => v.trim()).filter(Boolean);
    return allowed ? values.filter(v => allowed.includes(v)) : values;
}

/**
 * Dựng điều kiện lọc dùng chung cho danh sách, Kanban và KPI.
 * Người không có quyền xem chung chỉ thấy vấn đề mình phụ trách/phối hợp.
 */
export function buildIssueWhere(searchParams, actor) {
    const and = [{ deletedAt: null }];

    const statuses = splitParam(searchParams, 'status', ISSUE_STATUSES);
    if (statuses?.length) and.push({ status: { in: statuses } });
    const priorities = splitParam(searchParams, 'priority', ISSUE_PRIORITIES);
    if (priorities?.length) and.push({ priority: { in: priorities } });
    const categories = splitParam(searchParams, 'category', ISSUE_CATEGORIES);
    if (categories?.length) and.push({ category: { in: categories } });

    const customerId = searchParams.get('customerId');
    if (customerId) and.push({ customerId });
    const projectId = searchParams.get('projectId');
    if (projectId) and.push({ projectId });

    const assigneeId = searchParams.get('assigneeId');
    if (assigneeId === 'none') and.push({ assigneeId: null });
    else if (assigneeId === 'me') and.push({ assigneeId: actor.id });
    else if (assigneeId) and.push({ assigneeId });

    if (searchParams.get('mine') === '1') {
        and.push({ OR: [{ assigneeId: actor.id }, { collaborators: { some: { userId: actor.id } } }, { createdById: actor.id }] });
    }

    // Thời hạn: overdue = đã quá hạn, today = đến hạn trong hôm nay, week = đến hạn trong 7 ngày tới
    const now = new Date();
    const due = searchParams.get('overdue') === '1' ? 'overdue' : searchParams.get('due');
    if (due === 'overdue') {
        and.push({ status: { in: OPEN_STATUSES }, dueDate: { lt: now } });
    } else if (due === 'today' || due === 'week') {
        const end = new Date(now);
        if (due === 'week') end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        and.push({ status: { in: OPEN_STATUSES }, dueDate: { gte: now, lte: end } });
    }

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate && !isNaN(fromDate)) and.push({ reportedAt: { gte: fromDate } });
    if (toDate && !isNaN(toDate)) {
        // "to" dạng YYYY-MM-DD được hiểu là hết ngày đó
        if (/^\d{4}-\d{2}-\d{2}$/.test(to)) toDate.setHours(23, 59, 59, 999);
        and.push({ reportedAt: { lte: toDate } });
    }

    const search = searchParams.get('search')?.trim();
    if (search) {
        and.push({
            OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
                { area: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { reporterName: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
                { customer: { phone: { contains: search } } },
                { project: { name: { contains: search, mode: 'insensitive' } } },
            ],
        });
    }

    if (!getIssuePermissions(actor).view) {
        and.push({ OR: [{ assigneeId: actor.id || '__none__' }, { collaborators: { some: { userId: actor.id || '__none__' } } }] });
    }

    return { AND: and };
}

const SORTS = {
    lastActivity: [{ lastActivityAt: 'desc' }],
    newest: [{ reportedAt: 'desc' }],
    dueDate: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { lastActivityAt: 'desc' }],
    code: [{ code: 'desc' }],
};

export function buildIssueOrderBy(searchParams) {
    return SORTS[searchParams.get('sort')] || SORTS.lastActivity;
}

const OPEN_WORK_ORDER = { deletedAt: null, status: { not: WORK_ORDER_DONE_STATUS } };

/** Điều kiện của một cột Kanban (một trạng thái trong cột) — xem KANBAN_BOARD. */
export function boardColumnWhere(column, status) {
    const and = [{ status }];
    if (column.openWorkOrders === true) and.push({ workOrders: { some: OPEN_WORK_ORDER } });
    if (column.openWorkOrders === false) and.push({ workOrders: { none: OPEN_WORK_ORDER } });
    return and;
}

/** Gắn `openWorkOrderCount` (số phiếu liên kết chưa hoàn thành) vào từng vấn đề. */
export async function withOpenWorkOrderCounts(items) {
    if (!items.length) return items;
    const rows = await prisma.workOrder.groupBy({
        by: ['customerIssueId'],
        where: { ...OPEN_WORK_ORDER, customerIssueId: { in: items.map(i => i.id) } },
        _count: { _all: true },
    });
    const counts = Object.fromEntries(rows.map(r => [r.customerIssueId, r._count._all]));
    return items.map(i => ({ ...i, openWorkOrderCount: counts[i.id] || 0 }));
}

/**
 * Móc nối từ module Phiếu công việc: gọi khi một phiếu vừa chuyển sang hoàn thành.
 * Phiếu không liên kết vấn đề -> không làm gì (giữ nguyên hành vi cũ).
 * Kết quả hoàn thành của phiếu được nối vào kết quả xử lý; nếu mọi phiếu liên kết
 * đã xong và vấn đề đang NEW/IN_PROGRESS thì chuyển sang Chờ xác nhận.
 */
export async function syncIssueFromWorkOrder(workOrderId, { note = '', actor } = {}) {
    const wo = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { id: true, code: true, title: true, status: true, customerIssueId: true },
    });
    if (!wo?.customerIssueId) return null;

    return prisma.$transaction(async (tx) => {
        const issue = await tx.customerIssue.findUnique({ where: { id: wo.customerIssueId } });
        if (!issue) return null;

        const siblings = await tx.workOrder.findMany({
            where: { customerIssueId: issue.id, deletedAt: null },
            select: { status: true },
        });
        const moveToConfirmation = shouldAwaitConfirmation(issue.status, siblings);
        const resolution = appendResolution(issue.resolution, `${wo.code}: ${note.trim() || wo.title}`);

        const updated = await tx.customerIssue.update({
            where: { id: issue.id },
            data: {
                resolution,
                ...(moveToConfirmation ? transitionFields(ISSUE_STATUS.WAITING_CONFIRMATION, { actor }) : {}),
            },
        });

        await writeIssueLog(tx, issue.id, actor, {
            action: LOG_ACTION.WORK_ORDER_COMPLETED,
            message: `Phiếu ${wo.code} hoàn thành`,
            meta: { workOrderId: wo.id, note: note.trim() },
        });
        if (moveToConfirmation) {
            await writeIssueLog(tx, issue.id, actor, {
                action: LOG_ACTION.STATUS_CHANGED,
                fromStatus: issue.status,
                toStatus: ISSUE_STATUS.WAITING_CONFIRMATION,
                message: `Tự động: mọi phiếu công việc đã hoàn thành → ${ISSUE_STATUS_LABELS.WAITING_CONFIRMATION}`,
            });
        }
        return updated;
    });
}
