import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ISSUE_STATUS, ISSUE_STATUSES, OPEN_STATUSES, ISSUE_CATEGORIES, ISSUE_PRIORITY } from '@/lib/customerIssue/constants';
import { loadActor, buildIssueWhere } from '@/lib/customerIssue/service';

// GET /api/customer-issues/stats — KPI, nhận cùng bộ lọc với danh sách
// (bỏ qua lọc trạng thái/thời hạn để các con số theo trạng thái luôn đầy đủ).
export const GET = withAuth(async (request, _ctx, session) => {
    const actor = await loadActor(session);
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams(searchParams);
    params.delete('status');
    params.delete('overdue');
    params.delete('due');
    const base = buildIssueWhere(params, actor);
    const scoped = (extra) => ({ AND: [...base.AND, extra] });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [byStatusRaw, byCategoryRaw, overdue, urgentOpen, unassignedOpen, doneThisMonth, doneRows] = await Promise.all([
        prisma.customerIssue.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
        prisma.customerIssue.groupBy({ by: ['category'], where: scoped({ status: { in: OPEN_STATUSES } }), _count: { _all: true } }),
        prisma.customerIssue.count({ where: scoped({ status: { in: OPEN_STATUSES }, dueDate: { lt: now } }) }),
        prisma.customerIssue.count({ where: scoped({ status: { in: OPEN_STATUSES }, priority: ISSUE_PRIORITY.URGENT }) }),
        prisma.customerIssue.count({ where: scoped({ status: { in: OPEN_STATUSES }, assigneeId: null }) }),
        prisma.customerIssue.count({ where: scoped({ status: ISSUE_STATUS.DONE, confirmedAt: { gte: monthStart } }) }),
        prisma.customerIssue.findMany({
            where: scoped({ status: ISSUE_STATUS.DONE, confirmedAt: { not: null } }),
            select: { reportedAt: true, confirmedAt: true },
            orderBy: { confirmedAt: 'desc' },
            take: 500,
        }),
    ]);

    const byStatus = Object.fromEntries(ISSUE_STATUSES.map(s => [s, 0]));
    byStatusRaw.forEach(r => { byStatus[r.status] = r._count._all; });
    const byCategory = Object.fromEntries(ISSUE_CATEGORIES.map(c => [c, 0]));
    byCategoryRaw.forEach(r => { byCategory[r.category] = r._count._all; });

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const open = OPEN_STATUSES.reduce((a, s) => a + byStatus[s], 0);
    const avgResolutionHours = doneRows.length
        ? Math.round(doneRows.reduce((sum, r) => sum + (r.confirmedAt - r.reportedAt), 0) / doneRows.length / 3_600_000 * 10) / 10
        : null;

    return NextResponse.json({
        total, open, overdue, urgentOpen, unassignedOpen, doneThisMonth,
        avgResolutionHours, byStatus, byCategory,
    });
});
