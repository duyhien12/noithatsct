import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: Compare budget vs actual measurement for each contractor in a project
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    // Get all contractor payments with items for this project
    const payments = await prisma.contractorPayment.findMany({
        where: { projectId },
        include: {
            contractor: { select: { id: true, name: true, category: true } },
            items: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    // Get budget material plans (type = contractor/nhân công)
    const materialPlans = await prisma.materialPlan.findMany({
        where: { projectId },
        include: { product: { select: { name: true, code: true, unit: true } } },
    });

    // Group payments by contractor
    const byContractor = {};
    payments.forEach(p => {
        const cid = p.contractorId;
        if (!byContractor[cid]) {
            byContractor[cid] = {
                contractor: p.contractor,
                totalBudget: 0,
                totalMeasured: 0,
                totalPaid: 0,
                payments: [],
            };
        }
        byContractor[cid].totalMeasured += p.contractAmount;
        byContractor[cid].totalPaid += p.paidAmount;
        byContractor[cid].payments.push({
            id: p.id,
            phase: p.phase,
            status: p.status,
            contractAmount: p.contractAmount,
            paidAmount: p.paidAmount,
            createdAt: p.createdAt,
            itemCount: p.items.length,
        });
    });

    return NextResponse.json({
        contractors: Object.values(byContractor),
        budgetPlans: materialPlans.map(p => ({
            id: p.id,
            name: p.product?.name,
            unit: p.product?.unit,
            budgetQty: p.quantity,
            budgetPrice: p.budgetUnitPrice || p.unitPrice,
            budgetTotal: p.quantity * (p.budgetUnitPrice || p.unitPrice),
        })),
    });
});
