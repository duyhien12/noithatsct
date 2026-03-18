import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const planType = searchParams.get('planType') || 'tracking';

    // Use raw query to avoid stale Prisma client issues with nullable productId
    const allPlans = await prisma.$queryRaw`
        SELECT
            mp.*,
            p.name  AS "productName",
            p.code  AS "productCode",
            p.unit  AS "productUnit",
            COALESCE(
                (SELECT SUM(poi.quantity) FROM "PurchaseOrderItem" poi WHERE poi."materialPlanId" = mp.id),
                0
            ) AS "totalPOQty",
            COALESCE(
                (SELECT SUM(poi."unitPrice" * poi.quantity) FROM "PurchaseOrderItem" poi WHERE poi."materialPlanId" = mp.id),
                0
            ) AS "totalPOValue",
            COALESCE(
                (SELECT SUM(poi."receivedQty") FROM "PurchaseOrderItem" poi WHERE poi."materialPlanId" = mp.id),
                0
            ) AS "actualReceivedQty"
        FROM "MaterialPlan" mp
        LEFT JOIN "Product" p ON mp."productId" = p.id
        WHERE mp."projectId" = ${projectId}
          AND COALESCE(mp."planType", 'tracking') = ${planType}
        ORDER BY mp."createdAt" ASC
    `;

    const variance = allPlans.map(plan => {
        const totalPOQty = Number(plan.totalPOQty) || 0;
        const totalPOValue = Number(plan.totalPOValue) || 0;
        const actualReceivedQty = Number(plan.actualReceivedQty) || 0;

        const hasPO = totalPOQty > 0;
        const avgActualPrice = hasPO
            ? totalPOValue / totalPOQty
            : (Number(plan.actualCost) > 0 && Number(plan.quantity) > 0
                ? Number(plan.actualCost) / Number(plan.quantity)
                : 0);
        const effectiveActualTotal = hasPO
            ? avgActualPrice * (actualReceivedQty || Number(plan.orderedQty))
            : Number(plan.actualCost);

        const qty = Number(plan.quantity) || 0;
        const budgetUnitPrice = Number(plan.budgetUnitPrice) || 0;
        const wastePercent = Number(plan.wastePercent) || 5;
        const maxAllowedQty = qty * (1 + wastePercent / 100);
        const orderedQty = Number(plan.orderedQty) || 0;
        const usagePercent = maxAllowedQty > 0 ? (orderedQty / maxAllowedQty) * 100 : 0;
        const cpi = avgActualPrice > 0 ? Math.round((budgetUnitPrice / avgActualPrice) * 100) / 100 : null;

        let status = 'green';
        if (usagePercent >= 100 || avgActualPrice > budgetUnitPrice * 1.05) status = 'red';
        else if (usagePercent >= 90 || avgActualPrice > budgetUnitPrice) status = 'yellow';

        return {
            id: plan.id,
            productName: plan.productName || plan.category || '',
            productCode: plan.productCode || '',
            unit: plan.productUnit || plan.unit || '',
            category: plan.category || '',
            costType: plan.costType || 'Vật tư',
            group1: plan.group1 || '',
            group2: plan.group2 || '',
            drawingUrl: plan.drawingUrl || '',
            supplierTag: plan.supplierTag || '',
            budgetQty: qty,
            budgetUnitPrice,
            budgetTotal: qty * budgetUnitPrice,
            wastePercent,
            maxAllowedQty,
            orderedQty,
            receivedQty: actualReceivedQty || Number(plan.receivedQty) || 0,
            avgActualPrice,
            actualTotal: effectiveActualTotal,
            priceVariance: (avgActualPrice - budgetUnitPrice) * (actualReceivedQty || orderedQty),
            qtyVariance: (actualReceivedQty || orderedQty) - qty,
            usagePercent: Math.round(usagePercent * 10) / 10,
            cpi,
            status,
            isLocked: plan.isLocked,
        };
    });

    const totalBudget = variance.reduce((s, v) => s + v.budgetTotal, 0);
    const totalActual = variance.reduce((s, v) => s + v.actualTotal, 0);
    const totalVariance = totalActual - totalBudget;
    const overallCpi = totalActual > 0 ? Math.round((totalBudget / totalActual) * 100) / 100 : null;

    const groups = {};
    variance.forEach(v => {
        const key = v.group1 || 'Chưa phân loại';
        if (!groups[key]) groups[key] = { budget: 0, actual: 0, items: 0 };
        groups[key].budget += v.budgetTotal;
        groups[key].actual += v.actualTotal;
        groups[key].items += 1;
    });

    return NextResponse.json({
        items: variance,
        summary: { totalBudget, totalActual, totalVariance, overallCpi },
        groupSummary: Object.entries(groups).map(([name, d]) => ({
            name, ...d, variance: d.actual - d.budget,
            cpi: d.actual > 0 ? Math.round((d.budget / d.actual) * 100) / 100 : null,
        })),
    });
});
