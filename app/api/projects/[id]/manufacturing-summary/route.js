import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { computeProjectMfgStepState, isOrderLate } from '@/lib/manufacturing/progress';

// Tóm tắt sản xuất của 1 dự án — dùng cho pipeline header + tab "Sản xuất" trong trang chi tiết dự án.
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;

    const orders = await prisma.mfgOrder.findMany({
        where: { projectId: id, deletedAt: null },
        include: {
            items: { select: { id: true, status: true, progressPercent: true } },
            _count: { select: { qualityIssues: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const step = computeProjectMfgStepState(orders);
    const allItems = orders.flatMap(o => o.items);
    const openIssues = await prisma.qualityIssue.count({
        where: { mfgOrder: { projectId: id }, status: { in: ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION'] } },
    });

    return NextResponse.json({
        step,
        ordersCount: orders.length,
        itemsCount: allItems.length,
        itemsCompleted: allItems.filter(i => ['COMPLETED', 'INSTALLED', 'DELIVERED'].includes(i.status)).length,
        itemsWaitingMaterial: allItems.filter(i => i.status === 'WAITING_MATERIAL').length,
        itemsInError: allItems.filter(i => i.status === 'REWORK').length,
        lateOrders: orders.filter(isOrderLate).map(o => ({ id: o.id, code: o.code, plannedEndDate: o.plannedEndDate })),
        orders: orders.map(o => ({
            id: o.id, code: o.code, title: o.title, status: o.status, priority: o.priority,
            progressPercent: o.progressPercent, plannedEndDate: o.plannedEndDate,
            itemsCount: o.items.length, openIssuesCount: o._count.qualityIssues,
            isLate: isOrderLate(o),
        })),
    });
});
