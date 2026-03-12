import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const planType = searchParams.get('planType') || 'tracking';

    // Get all material plans, filter planType in JS (Prisma client may not have field yet)
    const allPlans = await prisma.materialPlan.findMany({
        where: { projectId },
        include: {
            product: { select: { name: true, code: true, unit: true } },
            purchaseItems: { select: { unitPrice: true, quantity: true, receivedQty: true } },
        },
    });

    // Filter by planType in JS (handles both old records without planType and new ones)
    const plans = allPlans.filter(p => {
        const pt = p.planType || 'tracking';
        return pt === planType;
    });

    const variance = plans.map(plan => {
        // Avg actual price from PO items (weighted by qty)
        const totalPOQty = plan.purchaseItems.reduce((s, i) => s + i.quantity, 0);
        const totalPOValue = plan.purchaseItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const avgActualPrice = totalPOQty > 0 ? totalPOValue / totalPOQty : 0;

        // Received qty from PO items
        const actualReceivedQty = plan.purchaseItems.reduce((s, i) => s + i.receivedQty, 0);

        // Max allowed qty
        const maxAllowedQty = plan.quantity * (1 + plan.wastePercent / 100);

        // Variance calculations
        const priceVariance = (avgActualPrice - plan.budgetUnitPrice) * (actualReceivedQty || plan.orderedQty);
        const qtyVariance = (actualReceivedQty || plan.orderedQty) - plan.quantity;
        const usagePercent = maxAllowedQty > 0 ? (plan.orderedQty / maxAllowedQty) * 100 : 0;

        // CPI = Budget / Actual (>1 = saving, <1 = overspending)
        const cpi = avgActualPrice > 0 ? Math.round((plan.budgetUnitPrice / avgActualPrice) * 100) / 100 : null;

        // Status: green/yellow/red
        let status = 'green';
        if (usagePercent >= 100 || avgActualPrice > plan.budgetUnitPrice * 1.05) {
            status = 'red';
        } else if (usagePercent >= 90 || avgActualPrice > plan.budgetUnitPrice) {
            status = 'yellow';
        }

        return {
            id: plan.id,
            productName: plan.product?.name || '',
            productCode: plan.product?.code || '',
            unit: plan.product?.unit || '',
            category: plan.category,
            // V2 fields
            costType: plan.costType || 'Vật tư',
            group1: plan.group1 || '',
            group2: plan.group2 || '',
            drawingUrl: plan.drawingUrl || '',
            supplierTag: plan.supplierTag || '',
            // Budget
            budgetQty: plan.quantity,
            budgetUnitPrice: plan.budgetUnitPrice,
            budgetTotal: plan.quantity * plan.budgetUnitPrice,
            wastePercent: plan.wastePercent,
            maxAllowedQty,
            // Actual
            orderedQty: plan.orderedQty,
            receivedQty: actualReceivedQty || plan.receivedQty,
            avgActualPrice,
            actualTotal: avgActualPrice * (actualReceivedQty || plan.orderedQty),
            // Variance
            priceVariance,
            qtyVariance,
            usagePercent: Math.round(usagePercent * 10) / 10,
            cpi,
            status,
            isLocked: plan.isLocked,
        };
    });

    // Summary
    const totalBudget = variance.reduce((s, v) => s + v.budgetTotal, 0);
    const totalActual = variance.reduce((s, v) => s + v.actualTotal, 0);
    const totalVariance = totalActual - totalBudget;
    const overallCpi = totalActual > 0 ? Math.round((totalBudget / totalActual) * 100) / 100 : null;

    // Group summaries
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

