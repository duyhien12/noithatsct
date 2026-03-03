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
        supplierPayableRows, contractorPayableRows, overdueRows,
        cashflowRows,
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
        // Supplier payable: per-row GREATEST to avoid negatives canceling positives
        prisma.$queryRaw`SELECT COALESCE(SUM(GREATEST(0, "totalAmount" - "paidAmount")), 0)::float AS payable FROM "PurchaseOrder" WHERE "supplierId" IS NOT NULL`,
        // Contractor payable
        prisma.$queryRaw`SELECT COALESCE(SUM(GREATEST(0, "contractAmount" - "paidAmount")), 0)::float AS payable FROM "ContractorPayment"`,
        // Overdue contractor payments (field comparison not possible in Prisma ORM)
        prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "ContractorPayment" WHERE "dueDate" < NOW() AND "contractAmount" > "paidAmount"`,
        // Monthly cashflow grouped in DB — avoids loading all rows into JS
        prisma.$queryRaw`
            SELECT
                TO_CHAR(date, 'YYYY-MM') AS month,
                COALESCE(SUM(CASE WHEN type = 'Thu' THEN amount ELSE 0 END), 0)::float AS thu,
                COALESCE(SUM(CASE WHEN type = 'Chi' THEN amount ELSE 0 END), 0)::float AS chi
            FROM "Transaction"
            WHERE date >= ${sixMonthsAgo}
            GROUP BY TO_CHAR(date, 'YYYY-MM')
            ORDER BY month
        `,
        // Stale work orders > 7 days
        prisma.workOrder.count({ where: { status: 'Chờ xử lý', createdAt: { lt: sevenDaysAgo } } }),
    ]);

    const supplierPayable = Number(supplierPayableRows[0]?.payable ?? 0);
    const contractorPayable = Number(contractorPayableRows[0]?.payable ?? 0);
    const overduePayments = Number(overdueRows[0]?.count ?? 0);

    // Receivables from projects
    const totalContractValue = contractValueAgg._sum.contractValue || 0;
    const totalPaid = contractValueAgg._sum.paidAmount || 0;
    const receivable = Math.max(0, totalContractValue - totalPaid);

    // Ensure all 6 months present in cashflow
    const monthlyMap = {};
    for (const row of cashflowRows) {
        monthlyMap[row.month] = { thu: Number(row.thu), chi: Number(row.chi) };
    }
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
            overduePayments,
            staleWorkOrders,
        },
    });
});
