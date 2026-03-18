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
            contractorPays: { include: { contractor: { select: { name: true, type: true, phone: true } }, items: { orderBy: { acceptedAt: 'asc' } } } },
            employees: { include: { employee: { select: { name: true, position: true, phone: true } } } },
            transactions: { orderBy: { date: 'desc' }, take: 10 },
            contracts: { include: { payments: { orderBy: { createdAt: 'asc' } }, quotation: { select: { code: true } } } },
            workOrders: { orderBy: { createdAt: 'desc' } },
            requisitions: { orderBy: { createdAt: 'desc' } },
            purchaseOrders: { include: { items: true, supplierRel: { select: { name: true, phone: true, address: true, taxCode: true, bankAccount: true, bankName: true } } }, orderBy: { createdAt: 'desc' } },
            expenses: { orderBy: { date: 'desc' } },
            trackingLogs: { orderBy: { createdAt: 'desc' } },
            documents: { where: { parentDocumentId: null }, orderBy: { createdAt: 'desc' }, include: { folder: { select: { name: true } }, _count: { select: { versions: true } } } },
            documentFolders: { where: { parentId: null }, orderBy: { order: 'asc' }, include: { _count: { select: { documents: true } }, children: { orderBy: { order: 'asc' }, include: { _count: { select: { documents: true } } } } } },
        },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch materialPlans via raw SQL to avoid stale Prisma client issues with nullable productId
    const materialPlans = await prisma.$queryRaw`
        SELECT mp.*, p.name AS "productName", p.code AS "productCode", p.unit AS "productUnit"
        FROM "MaterialPlan" mp
        LEFT JOIN "Product" p ON mp."productId" = p.id
        WHERE mp."projectId" = ${project.id}
        ORDER BY mp."createdAt" ASC
    `;

    // P&L
    const income = project.paidAmount ?? 0;
    const expense = project.spent ?? 0;
    const profit = income - expense;
    const profitMargin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
    const debtFromCustomer = (project.contractValue ?? 0) - income;
    const debtToContractors = project.contractorPays.reduce((s, p) => s + ((p.contractAmount ?? 0) - (p.paidAmount ?? 0)), 0);

    // Settlement (Quyet toan)
    const totalContractValue = project.contracts.reduce((s, c) => s + (c.contractValue ?? 0), 0);
    const totalVariation = project.contracts.reduce((s, c) => s + (c.variationAmount ?? 0), 0);
    const totalCollected = project.contracts.reduce((s, c) => s + (c.paidAmount ?? 0), 0);
    const totalPurchase = project.purchaseOrders.reduce((s, po) => s + (po.totalAmount ?? 0), 0);
    const totalExpenses = project.expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalContractorCost = project.contractorPays.reduce((s, p) => s + (p.contractAmount ?? 0), 0);
    const totalCostB = totalPurchase + totalExpenses + totalContractorCost;
    const totalPaidB = project.purchaseOrders.reduce((s, po) => s + (po.paidAmount ?? 0), 0)
        + project.expenses.reduce((s, e) => s + (e.paidAmount ?? 0), 0)
        + project.contractorPays.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
    const totalA = totalContractValue + totalVariation;

    const settlement = {
        sideA: { contractValue: totalContractValue, variation: totalVariation, total: totalA, collected: totalCollected, remaining: totalA - totalCollected, rate: totalA > 0 ? ((totalCollected / totalA) * 100).toFixed(1) : 0 },
        sideB: { purchase: totalPurchase, expenses: totalExpenses, contractor: totalContractorCost, total: totalCostB, paid: totalPaidB, remaining: totalCostB - totalPaidB },
        profit: totalCollected - totalCostB,
        profitRate: totalCollected > 0 ? (((totalCollected - totalCostB) / totalCollected) * 100).toFixed(1) : 0,
    };

    return NextResponse.json({
        ...project,
        materialPlans,
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
