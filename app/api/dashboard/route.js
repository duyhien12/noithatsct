import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Monthly cashflow: last 6 months
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
        customerCount, projectCount, productCount,
        contractCount, workOrderCount,
        income, expense,
        activeProjects, pendingWorkOrders,
        contractValueAgg,
        recentProjects, projectsByStatus,
        allPOs, allCPs,
        transactions,
        staleWorkOrders,
    ] = await Promise.all([
        prisma.customer.count(),
        prisma.project.count(),
        prisma.product.count(),
        prisma.contract.count(),
        prisma.workOrder.count(),
        prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }),
        prisma.project.count({ where: { status: { in: ['Thi công', 'Thiết kế', 'Đang thi công', 'Hoàn thiện'] }, deletedAt: null } }),
        prisma.workOrder.count({ where: { status: 'Chờ xử lý' } }),
        prisma.project.aggregate({ where: { deletedAt: null }, _sum: { contractValue: true, paidAmount: true } }),
        prisma.project.findMany({ take: 5, where: { deletedAt: null }, orderBy: { updatedAt: 'desc' }, include: { customer: { select: { name: true } } } }),
        prisma.project.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
        // For payables
        prisma.purchaseOrder.findMany({ where: { supplierId: { not: null } }, select: { totalAmount: true, paidAmount: true } }),
        prisma.contractorPayment.findMany({ select: { contractAmount: true, paidAmount: true, dueDate: true, contractor: { select: { name: true } }, project: { select: { name: true } } } }),
        // Monthly cashflow
        prisma.transaction.findMany({ where: { date: { gte: sixMonthsAgo } }, select: { type: true, amount: true, date: true } }),
        // Stale work orders > 7 days
        prisma.workOrder.count({ where: { status: 'Chờ xử lý', createdAt: { lt: sevenDaysAgo } } }),
    ]);

    // Payables
    const supplierPayable = allPOs.reduce((s, po) => s + Math.max(0, (po.totalAmount || 0) - (po.paidAmount || 0)), 0);
    const contractorPayable = allCPs.reduce((s, cp) => s + Math.max(0, (cp.contractAmount || 0) - (cp.paidAmount || 0)), 0);

    // Receivables from projects
    const totalContractValue = contractValueAgg._sum.contractValue || 0;
    const totalPaid = contractValueAgg._sum.paidAmount || 0;
    const receivable = Math.max(0, totalContractValue - totalPaid);

    // Overdue contractor payments
    const overduePayments = allCPs.filter(cp =>
        cp.dueDate && new Date(cp.dueDate) < now &&
        (cp.contractAmount || 0) > (cp.paidAmount || 0)
    );

    // Monthly cashflow grouping
    const monthlyMap = {};
    for (const t of transactions) {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = { thu: 0, chi: 0 };
        if (t.type === 'Thu') monthlyMap[key].thu += t.amount || 0;
        else monthlyMap[key].chi += t.amount || 0;
    }
    // Ensure all 6 months present
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) monthlyMap[key] = { thu: 0, chi: 0 };
    }
    const monthlyCashflow = Object.entries(monthlyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v]) => ({ month, ...v }));

    return NextResponse.json({
        stats: {
            revenue: income._sum.amount || 0,
            expense: expense._sum.amount || 0,
            projects: projectCount,
            activeProjects,
            customers: customerCount,
            products: productCount,
            contracts: contractCount,
            workOrders: workOrderCount,
            pendingWorkOrders,
            totalContractValue,
            totalPaid,
            receivable,
            supplierPayable,
            contractorPayable,
        },
        recentProjects,
        projectsByStatus,
        monthlyCashflow,
        alerts: {
            overduePayments: overduePayments.length,
            staleWorkOrders,
        },
    });
});
