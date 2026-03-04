import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const [
        customerCount, projectCount, productCount, quotationCount, contractCount, workOrderCount,
        income, expense, activeProjects, pendingWorkOrders, contractValueAgg,
        recentProjects, projectsByStatus, lowStockProducts,
    ] = await Promise.all([
        prisma.customer.count(),
        prisma.project.count(),
        prisma.product.count(),
        prisma.quotation.count(),
        prisma.contract.count(),
        prisma.workOrder.count(),
        prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }),
        prisma.project.count({ where: { status: { in: ['Thi công', 'Thiết kế', 'Đang thi công'] } } }),
        prisma.workOrder.count({ where: { status: 'Chờ xử lý' } }),
        prisma.contract.aggregate({ _sum: { contractValue: true, paidAmount: true } }),
        prisma.project.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
            include: { customer: { select: { name: true } } },
        }),
        prisma.project.groupBy({ by: ['status'], _count: true }),
        // Low stock alert: out of stock (non-service)
        prisma.product.findMany({
            where: { stock: 0, supplyType: { not: 'Dịch vụ' } },
            select: { id: true, name: true, code: true, stock: true, minStock: true, category: true, image: true },
            take: 10,
        }).catch(() => []),
    ]);

    return NextResponse.json({
        stats: {
            revenue: income._sum.amount || 0,
            expense: expense._sum.amount || 0,
            projects: projectCount,
            activeProjects,
            customers: customerCount,
            products: productCount,
            quotations: quotationCount,
            contracts: contractCount,
            workOrders: workOrderCount,
            pendingWorkOrders,
            totalContractValue: contractValueAgg._sum.contractValue || 0,
            totalPaid: contractValueAgg._sum.paidAmount || 0,
        },
        recentProjects,
        projectsByStatus,
        lowStockProducts,
    });
});
