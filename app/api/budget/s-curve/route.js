import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { startDate: true, endDate: true },
    });

    // === DỰ TOÁN: Tổng cộng từ bảng dự trù kinh phí (planType=budget) ===
    const allPlans = await prisma.materialPlan.findMany({
        where: { projectId },
        select: { quantity: true, budgetUnitPrice: true, planType: true, createdAt: true },
    });
    const materialPlans = allPlans.filter(p => (p.planType || 'tracking') === 'budget');
    const budgetTotal = materialPlans.reduce((s, p) => s + p.quantity * p.budgetUnitPrice, 0);

    // === THỰC CHI: Tổng cộng từ bảng theo dõi chênh lệch vật tư (PO items của tracking) ===
    const poItems = await prisma.purchaseOrderItem.findMany({
        where: { purchaseOrder: { projectId } },
        include: { purchaseOrder: { select: { orderDate: true, status: true } } },
    });
    const actualTotal = poItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    // Project timeline
    const startDate = project?.startDate || new Date();
    const endDate = project?.endDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const totalWeeks = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (7 * 24 * 60 * 60 * 1000)));

    // Group actual PO costs by week
    const weekStart = new Date(startDate);
    const getWeek = (date) => Math.floor((new Date(date) - weekStart) / (7 * 24 * 60 * 60 * 1000));

    const weeklyActual = {};
    poItems.forEach(item => {
        const date = item.purchaseOrder?.orderDate || item.purchaseOrder?.createdAt || new Date();
        const w = Math.max(0, getWeek(date));
        weeklyActual[w] = (weeklyActual[w] || 0) + item.quantity * item.unitPrice;
    });

    // Build cumulative data points
    const maxWeek = Math.max(totalWeeks, ...Object.keys(weeklyActual).map(Number), 1);
    const weeklyBudget = budgetTotal / totalWeeks;
    const dataPoints = [];
    let cumBudget = 0;
    let cumActual = 0;

    for (let w = 0; w <= maxWeek; w++) {
        cumBudget = Math.min(cumBudget + weeklyBudget, budgetTotal);
        cumActual += weeklyActual[w] || 0;

        const weekDate = new Date(weekStart);
        weekDate.setDate(weekDate.getDate() + w * 7);

        dataPoints.push({
            week: w,
            date: weekDate.toISOString(),
            label: `T${w + 1}`,
            budget: Math.round(cumBudget),
            actual: Math.round(cumActual),
        });
    }

    return NextResponse.json({
        dataPoints,
        summary: {
            budgetTotal: Math.round(budgetTotal),
            actualTotal: Math.round(actualTotal),
            variance: Math.round(actualTotal - budgetTotal),
            totalWeeks: maxWeek + 1,
            projectStart: startDate,
            projectEnd: endDate,
        },
    });
});
