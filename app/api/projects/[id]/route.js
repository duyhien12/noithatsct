import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { projectUpdateSchema } from '@/lib/validations/project';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            customer: true,
            quotations: { include: { items: true } },
            milestones: { orderBy: { order: 'asc' } },
            budgets: true,
            contractorPays: { include: { contractor: { select: { name: true, type: true, phone: true } } } },
            employees: { include: { employee: { select: { name: true, position: true, phone: true } } } },
            transactions: { orderBy: { date: 'desc' }, take: 10 },
            contracts: { include: { payments: { orderBy: { createdAt: 'asc' } }, quotation: { select: { code: true } } } },
            workOrders: { orderBy: { createdAt: 'desc' } },
            materialPlans: { include: { product: { select: { name: true, code: true, unit: true } } } },
            purchaseOrders: { include: { items: true }, orderBy: { createdAt: 'desc' } },
            expenses: { orderBy: { date: 'desc' } },
            trackingLogs: { orderBy: { createdAt: 'desc' } },
            documents: { where: { parentDocumentId: null }, orderBy: { createdAt: 'desc' }, include: { folder: { select: { name: true } }, _count: { select: { versions: true } } } },
            documentFolders: { where: { parentId: null }, orderBy: { order: 'asc' }, include: { _count: { select: { documents: true } }, children: { orderBy: { order: 'asc' }, include: { _count: { select: { documents: true } } } } } },
        },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // P&L
    const income = project.paidAmount;
    const expense = project.spent;
    const profit = income - expense;
    const profitMargin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
    const debtFromCustomer = project.contractValue - project.paidAmount;
    const debtToContractors = project.contractorPays.reduce((s, p) => s + (p.contractAmount - p.paidAmount), 0);

    // Settlement (Quyet toan)
    const totalContractValue = project.contracts.reduce((s, c) => s + c.contractValue, 0);
    const totalVariation = project.contracts.reduce((s, c) => s + c.variationAmount, 0);
    const totalCollected = project.contracts.reduce((s, c) => s + c.paidAmount, 0);
    const totalPurchase = project.purchaseOrders.reduce((s, po) => s + po.totalAmount, 0);
    const totalExpenses = project.expenses.reduce((s, e) => s + e.amount, 0);
    const totalContractorCost = project.contractorPays.reduce((s, p) => s + p.contractAmount, 0);
    const totalCostB = totalPurchase + totalExpenses + totalContractorCost;
    const totalPaidB = project.purchaseOrders.reduce((s, po) => s + po.paidAmount, 0)
        + project.expenses.reduce((s, e) => s + e.paidAmount, 0)
        + project.contractorPays.reduce((s, p) => s + p.paidAmount, 0);

    const settlement = {
        sideA: { contractValue: totalContractValue, variation: totalVariation, total: totalContractValue + totalVariation, collected: totalCollected, remaining: totalContractValue + totalVariation - totalCollected, rate: totalContractValue > 0 ? ((totalCollected / (totalContractValue + totalVariation)) * 100).toFixed(1) : 0 },
        sideB: { purchase: totalPurchase, expenses: totalExpenses, contractor: totalContractorCost, total: totalCostB, paid: totalPaidB, remaining: totalCostB - totalPaidB },
        profit: totalCollected - totalCostB,
        profitRate: totalCollected > 0 ? (((totalCollected - totalCostB) / totalCollected) * 100).toFixed(1) : 0,
    };

    return NextResponse.json({
        ...project,
        pnl: { income, expense, profit, profitMargin, debtFromCustomer, debtToContractors },
        settlement,
    });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = projectUpdateSchema.parse(body);

    const project = await prisma.project.update({ where: { id }, data });
    return NextResponse.json(project);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
        await tx.contractPayment.deleteMany({ where: { contract: { projectId: id } } });
        await tx.contract.deleteMany({ where: { projectId: id } });
        await tx.workOrder.deleteMany({ where: { projectId: id } });
        await tx.materialPlan.deleteMany({ where: { projectId: id } });
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { projectId: id } } });
        await tx.purchaseOrder.deleteMany({ where: { projectId: id } });
        await tx.projectExpense.deleteMany({ where: { projectId: id } });
        await tx.trackingLog.deleteMany({ where: { projectId: id } });
        await tx.projectDocument.deleteMany({ where: { projectId: id } });
        await tx.documentFolder.deleteMany({ where: { parentId: { not: null }, projectId: id } });
        await tx.documentFolder.deleteMany({ where: { projectId: id } });
        await tx.projectMilestone.deleteMany({ where: { projectId: id } });
        await tx.projectBudget.deleteMany({ where: { projectId: id } });
        await tx.contractorPayment.deleteMany({ where: { projectId: id } });
        await tx.projectEmployee.deleteMany({ where: { projectId: id } });
        await tx.inventoryTransaction.deleteMany({ where: { projectId: id } });
        await tx.transaction.deleteMany({ where: { projectId: id } });
        await tx.quotationItem.deleteMany({ where: { quotation: { projectId: id } } });
        await tx.quotation.deleteMany({ where: { projectId: id } });
        await tx.project.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
});
