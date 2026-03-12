import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            contracts: { select: { contractValue: true, paidAmount: true, status: true } },
            expenses: { select: { amount: true, paidAmount: true, status: true } },
            contractorPays: { select: { contractAmount: true, paidAmount: true, status: true } },
        },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // A: Contract value (revenue)
    const contractValue = project.contractValue || project.contracts.reduce((s, c) => s + c.contractValue, 0);

    // B: Budget total
    const budgetTotal = project.budgetTotal || 0;

    // C: Actual spent
    const materialSpent = await prisma.purchaseOrder.aggregate({
        where: { projectId, status: { not: 'Đã hủy' } },
        _sum: { paidAmount: true },
    });
    const expenseSpent = project.expenses.reduce((s, e) => s + (e.paidAmount || 0), 0);
    const contractorSpent = project.contractorPays.reduce((s, c) => s + (c.paidAmount ?? 0), 0);
    const totalSpent = (materialSpent._sum.paidAmount || 0) + expenseSpent + contractorSpent;

    // Remaining committed (ordered but not paid)
    const materialCommitted = await prisma.purchaseOrder.aggregate({
        where: { projectId, status: { not: 'Đã hủy' } },
        _sum: { totalAmount: true },
    });
    const remainingCommitted = (materialCommitted._sum.totalAmount || 0) - (materialSpent._sum.paidAmount || 0);

    // Profitability
    const targetProfit = contractValue - budgetTotal;
    const targetMargin = contractValue > 0 ? (targetProfit / contractValue) * 100 : 0;
    const estimatedProfit = contractValue - totalSpent - remainingCommitted;
    const estimatedMargin = contractValue > 0 ? (estimatedProfit / contractValue) * 100 : 0;

    return NextResponse.json({
        contractValue,
        budgetTotal,
        totalSpent,
        remainingCommitted,
        targetProfit,
        targetMargin: Math.round(targetMargin * 10) / 10,
        estimatedProfit,
        estimatedMargin: Math.round(estimatedMargin * 10) / 10,
        budgetStatus: project.budgetStatus,
        budgetLockedAt: project.budgetLockedAt,
    });
});
