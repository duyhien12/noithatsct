import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';

export const GET = withAuth(async (request, ctx, session) => {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')) : new Date(Date.now() - 13 * 86400000);
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')) : new Date();
    const projectId = searchParams.get('projectId') || undefined;
    const canViewCost = hasMfgPermission(session.user, 'view_cost');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    const orderWhere = { deletedAt: null, ...(projectId && { projectId }) };
    const activeOrderWhere = { ...orderWhere, status: { notIn: ['CANCELLED', 'COMPLETED'] } };

    const [
        activeProjectIds, ordersInProgress, allActiveOrders, itemStatusGroups,
        openIssues, deliveries7d, unapprovedOrders, failedQcRecent, overdueIssues,
        completedTodayInspections, issuesByStageRaw,
    ] = await Promise.all([
        prisma.mfgOrder.findMany({ where: activeOrderWhere, select: { projectId: true }, distinct: ['projectId'] }),
        prisma.mfgOrder.count({ where: { ...orderWhere, status: 'IN_PRODUCTION' } }),
        prisma.mfgOrder.findMany({ where: activeOrderWhere, select: { id: true, code: true, status: true, plannedEndDate: true, progressPercent: true, project: { select: { code: true, name: true } } } }),
        prisma.mfgItem.groupBy({ by: ['status'], _count: { _all: true }, where: projectId ? { projectId } : {} }),
        prisma.qualityIssue.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION'] }, ...(projectId && { mfgOrder: { projectId } }) } }),
        prisma.deliveryRecord.count({ where: { deliveryDate: { gte: now, lte: in7Days }, ...(projectId && { projectId }) } }),
        prisma.mfgOrder.count({ where: { ...orderWhere, status: 'WAITING_APPROVAL' } }),
        prisma.qualityInspection.findMany({ where: { result: 'FAILED', inspectedAt: { gte: dateFrom }, ...(projectId && { mfgOrder: { projectId } }) }, select: { id: true, code: true, item: { select: { code: true, name: true } } }, take: 20, orderBy: { inspectedAt: 'desc' } }),
        prisma.qualityIssue.findMany({ where: { dueDate: { lt: now }, status: { in: ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION'] }, ...(projectId && { mfgOrder: { projectId } }) }, select: { id: true, code: true, title: true, dueDate: true }, take: 20 }),
        prisma.qualityInspection.count({ where: { result: 'PASSED', inspectedAt: { gte: todayStart }, ...(projectId && { mfgOrder: { projectId } }) } }),
        prisma.qualityIssue.groupBy({ by: ['mfgItemStageId'], _count: { _all: true }, where: { mfgItemStageId: { not: null }, ...(projectId && { mfgOrder: { projectId } }) } }),
    ]);

    const lateOrders = allActiveOrders.filter(o => o.plannedEndDate && new Date(o.plannedEndDate) < now && !['COMPLETED', 'DELIVERED', 'INSTALLING'].includes(o.status));

    // Sản lượng hoàn thành theo ngày (QC đạt, N ngày gần nhất)
    const passedInspections = await prisma.qualityInspection.findMany({
        where: { result: 'PASSED', inspectedAt: { gte: dateFrom, lte: dateTo }, ...(projectId && { mfgOrder: { projectId } }) },
        select: { inspectedAt: true },
    });
    const productionByDay = {};
    for (const insp of passedInspections) {
        const key = insp.inspectedAt.toISOString().slice(0, 10);
        productionByDay[key] = (productionByDay[key] || 0) + 1;
    }

    // Tỷ lệ đạt QC lần đầu: trong các item có >=1 inspection, tỷ lệ item có inspection đầu tiên PASSED
    const itemsWithInspections = await prisma.qualityInspection.findMany({
        where: { mfgItemId: { not: null }, ...(projectId && { mfgOrder: { projectId } }) },
        select: { mfgItemId: true, result: true, inspectedAt: true },
        orderBy: { inspectedAt: 'asc' },
    });
    const firstByItem = {};
    for (const insp of itemsWithInspections) {
        if (!firstByItem[insp.mfgItemId]) firstByItem[insp.mfgItemId] = insp.result;
    }
    const firstResults = Object.values(firstByItem);
    const firstPassRate = firstResults.length ? Math.round((firstResults.filter(r => r === 'PASSED').length / firstResults.length) * 100) : null;

    // Lỗi theo công đoạn — resolve tên
    const stageIds = issuesByStageRaw.map(g => g.mfgItemStageId).filter(Boolean);
    const stages = stageIds.length ? await prisma.mfgItemStage.findMany({ where: { id: { in: stageIds } }, select: { id: true, name: true } }) : [];
    const stageNameMap = Object.fromEntries(stages.map(s => [s.id, s.name]));
    const issuesByStage = issuesByStageRaw.map(g => ({ name: stageNameMap[g.mfgItemStageId] || 'Khác', count: g._count._all }));

    return NextResponse.json({
        cards: {
            projectsInProduction: activeProjectIds.length,
            ordersInProgress,
            ordersLate: lateOrders.length,
            itemsWaitingMaterial: itemStatusGroups.find(g => g.status === 'WAITING_MATERIAL')?._count._all || 0,
            itemsWaitingQc: itemStatusGroups.find(g => g.status === 'WAITING_QC')?._count._all || 0,
            openIssues,
            completedToday: completedTodayInspections,
            deliveriesNext7Days: deliveries7d,
        },
        alerts: {
            lateOrders: lateOrders.map(o => ({ id: o.id, code: o.code, project: o.project, plannedEndDate: o.plannedEndDate })),
            unapprovedOrders,
            failedQc: failedQcRecent,
            overdueIssues,
        },
        charts: {
            ordersProgress: allActiveOrders.map(o => ({ code: o.code, project: o.project?.name, progress: o.progressPercent })),
            itemsByStatus: itemStatusGroups.map(g => ({ status: g.status, count: g._count._all })),
            productionByDay: Object.entries(productionByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
            issuesByStage,
            firstPassRate,
        },
        canViewCost,
    });
});
