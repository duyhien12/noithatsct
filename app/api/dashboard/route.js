import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const DASHBOARD_ROLES = ['giam_doc', 'pho_gd'];
const ADMIN_EMAIL = 'admin@kientrucsct.com';

export const GET = withAuth(async (request, context, session) => {
    const role = session?.user?.role;
    const email = session?.user?.email;
    if (!DASHBOARD_ROLES.includes(role) && email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }
    const safe = (p, fallback) => p.catch(() => fallback);
    const [
        customerCount, projectCount, productCount, quotationCount, contractCount, workOrderCount,
        income, expense, activeProjects, pendingWorkOrders, contractValueAgg,
        recentProjects, projectsByStatus, lowStockProducts,
    ] = await Promise.all([
        safe(prisma.customer.count(), 0),
        safe(prisma.project.count(), 0),
        safe(prisma.product.count(), 0),
        safe(prisma.quotation.count(), 0),
        safe(prisma.contract.count(), 0),
        safe(prisma.workOrder.count(), 0),
        safe(prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
        safe(prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
        safe(prisma.project.count({ where: { status: { in: ['Thi công', 'Thiết kế', 'Đang thi công'] } } }), 0),
        safe(prisma.workOrder.count({ where: { status: 'Chờ xử lý' } }), 0),
        safe(prisma.contract.aggregate({ _sum: { contractValue: true, paidAmount: true } }), { _sum: { contractValue: 0, paidAmount: 0 } }),
        safe(prisma.project.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
            include: { customer: { select: { name: true } } },
        }), []),
        safe(prisma.project.groupBy({ by: ['status'], _count: true }), []),
        // Low stock alert: out of stock (non-service)
        safe(prisma.product.findMany({
            where: { stock: 0, supplyType: { not: 'Dịch vụ' } },
            select: { id: true, name: true, code: true, stock: true, minStock: true, category: true, image: true },
            take: 10,
        }), []),
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
