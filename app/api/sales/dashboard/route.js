import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
        totalCustomers,
        newCustomersThisMonth,
        pipelineGroups,
        quotationStats,
        contractStats,
        recentCustomers,
        upcomingFollowUps,
    ] = await Promise.all([
        // Tổng khách hàng
        prisma.customer.count({ where: { deletedAt: null } }),

        // Khách hàng mới tháng này
        prisma.customer.count({
            where: { deletedAt: null, createdAt: { gte: startOfMonth } },
        }),

        // Pipeline theo stage
        prisma.customer.groupBy({
            by: ['pipelineStage'],
            where: { deletedAt: null },
            _count: true,
        }),

        // Báo giá
        prisma.quotation.aggregate({
            _count: true,
            _sum: { grandTotal: true },
            where: { createdAt: { gte: startOfYear }, deletedAt: null },
        }),

        // Hợp đồng
        prisma.contract.aggregate({
            _count: true,
            _sum: { contractValue: true },
            where: { createdAt: { gte: startOfYear }, deletedAt: null },
        }),

        // Khách hàng gần đây
        prisma.customer.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
                id: true, code: true, name: true, phone: true,
                pipelineStage: true, source: true, salesPerson: true,
                estimatedValue: true, createdAt: true,
            },
        }),

        // Follow-up sắp tới (7 ngày)
        prisma.customer.findMany({
            where: {
                deletedAt: null,
                nextFollowUp: {
                    gte: now,
                    lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
                },
            },
            orderBy: { nextFollowUp: 'asc' },
            take: 10,
            select: {
                id: true, name: true, phone: true,
                pipelineStage: true, nextFollowUp: true, salesPerson: true,
            },
        }),
    ]);

    return Response.json({
        stats: {
            totalCustomers,
            newCustomersThisMonth,
            totalQuotations: quotationStats._count,
            quotationValue: quotationStats._sum.grandTotal || 0,
            totalContracts: contractStats._count,
            contractValue: contractStats._sum.contractValue || 0,
        },
        pipelineGroups,
        recentCustomers,
        upcomingFollowUps,
    });
});
