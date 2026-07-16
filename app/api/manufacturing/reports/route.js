import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';

export const GET = withAuth(async (request, ctx, session) => {
    if (!hasMfgPermission(session.user, 'report')) {
        return NextResponse.json({ error: 'Bạn không có quyền xem báo cáo' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')) : new Date(Date.now() - 29 * 86400000);
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')) : new Date();
    const projectId = searchParams.get('projectId') || undefined;
    const canViewCost = hasMfgPermission(session.user, 'view_cost');

    const orderWhere = { deletedAt: null, createdAt: { gte: dateFrom, lte: dateTo }, ...(projectId && { projectId }) };

    const orders = await prisma.mfgOrder.findMany({
        where: orderWhere,
        select: { id: true, status: true, plannedEndDate: true, actualEndDate: true, progressPercent: true },
    });
    const nonCancelled = orders.filter(o => o.status !== 'CANCELLED');
    const doneOrders = nonCancelled.filter(o => o.actualEndDate);
    const onTimeOrders = doneOrders.filter(o => o.plannedEndDate && o.actualEndDate <= o.plannedEndDate);
    const lateOrdersList = nonCancelled.filter(o => o.plannedEndDate && (o.actualEndDate ? o.actualEndDate > o.plannedEndDate : (new Date() > new Date(o.plannedEndDate) && !['COMPLETED', 'DELIVERED', 'INSTALLING'].includes(o.status))));
    const avgLateDays = lateOrdersList.length
        ? Math.round(lateOrdersList.reduce((s, o) => s + Math.max(0, Math.ceil(((o.actualEndDate || new Date()) - new Date(o.plannedEndDate)) / 86400000)), 0) / lateOrdersList.length)
        : 0;

    const itemWhere = { ...(projectId && { projectId }), createdAt: { gte: dateFrom, lte: dateTo } };
    const [itemsWaitingMaterial, itemsWaitingQc, allItems] = await Promise.all([
        prisma.mfgItem.count({ where: { ...itemWhere, status: 'WAITING_MATERIAL' } }),
        prisma.mfgItem.count({ where: { ...itemWhere, status: 'WAITING_QC' } }),
        prisma.mfgItem.findMany({ where: itemWhere, select: { id: true, status: true, assignedTeamName: true, progressPercent: true } }),
    ]);

    // Chất lượng
    const inspections = await prisma.qualityInspection.findMany({
        where: { inspectedAt: { gte: dateFrom, lte: dateTo }, ...(projectId && { mfgOrder: { projectId } }) },
        select: { mfgItemId: true, result: true, inspectedAt: true },
        orderBy: { inspectedAt: 'asc' },
    });
    const firstByItem = {};
    for (const insp of inspections) if (insp.mfgItemId && !firstByItem[insp.mfgItemId]) firstByItem[insp.mfgItemId] = insp.result;
    const firstResults = Object.values(firstByItem);
    const firstPassRate = firstResults.length ? Math.round((firstResults.filter(r => r === 'PASSED').length / firstResults.length) * 100) : null;
    const reworkRate = firstResults.length ? Math.round((firstResults.filter(r => r === 'FAILED').length / firstResults.length) * 100) : null;

    const issues = await prisma.qualityIssue.findMany({
        where: { reportedAt: { gte: dateFrom, lte: dateTo }, ...(projectId && { mfgOrder: { projectId } }) },
        select: { severity: true, status: true, responsibleTeamName: true, repairCost: true, itemStage: { select: { name: true } } },
    });
    const issuesBySeverity = {};
    const issuesByStage = {};
    const issuesByTeam = {};
    let totalRepairCost = 0;
    for (const i of issues) {
        issuesBySeverity[i.severity] = (issuesBySeverity[i.severity] || 0) + 1;
        const stageName = i.itemStage?.name || 'Khác';
        issuesByStage[stageName] = (issuesByStage[stageName] || 0) + 1;
        const team = i.responsibleTeamName || 'Chưa gán';
        issuesByTeam[team] = (issuesByTeam[team] || 0) + 1;
        totalRepairCost += i.repairCost || 0;
    }

    // Năng suất
    const logs = await prisma.mfgLog.findMany({
        where: { logDate: { gte: dateFrom, lte: dateTo }, ...(projectId && { mfgOrder: { projectId } }) },
        select: { logDate: true, workHours: true, completedQuantity: true, teamName: true, workerId: true, mfgItemId: true, mfgOrderId: true, worker: { select: { name: true } } },
    });
    const productionByDay = {};
    const hoursByTeam = {};
    const hoursByWorker = {};
    for (const l of logs) {
        const day = l.logDate.toISOString().slice(0, 10);
        productionByDay[day] = (productionByDay[day] || 0) + (l.completedQuantity || 0);
        const team = l.teamName || 'Chưa gán';
        hoursByTeam[team] = (hoursByTeam[team] || 0) + (l.workHours || 0);
        const workerName = l.worker?.name || 'Chưa gán';
        hoursByWorker[workerName] = (hoursByWorker[workerName] || 0) + (l.workHours || 0);
    }

    return NextResponse.json({
        progress: {
            onTimeRate: doneOrders.length ? Math.round((onTimeOrders.length / doneOrders.length) * 100) : null,
            lateOrdersCount: lateOrdersList.length,
            avgLateDays,
            itemsWaitingMaterial,
            itemsWaitingQc,
        },
        quality: {
            firstPassRate,
            reworkRate,
            issuesBySeverity: Object.entries(issuesBySeverity).map(([severity, count]) => ({ severity, count })),
            issuesByStage: Object.entries(issuesByStage).map(([name, count]) => ({ name, count })),
            issuesByTeam: Object.entries(issuesByTeam).map(([name, count]) => ({ name, count })),
            totalRepairCost: canViewCost ? totalRepairCost : null,
        },
        productivity: {
            productionByDay: Object.entries(productionByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, qty]) => ({ date, qty })),
            hoursByTeam: Object.entries(hoursByTeam).map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 })),
            hoursByWorker: Object.entries(hoursByWorker).map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 })),
            itemsCompleted: allItems.filter(i => ['COMPLETED', 'INSTALLED', 'DELIVERED'].includes(i.status)).length,
            itemsTotal: allItems.length,
        },
        canViewCost,
    });
});
