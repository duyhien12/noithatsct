import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const branchFilter = { branch: 'LC' };

    const [
        totalCustomers,
        newCustomersThisMonth,
        pipelineGroups,
        quotationStats,
        contractStats,
        recentCustomers,
        upcomingFollowUps,
    ] = await Promise.all([
        prisma.customer.count({
            where: { deletedAt: null, ...branchFilter },
        }),

        prisma.customer.count({
            where: { deletedAt: null, createdAt: { gte: startOfMonth }, ...branchFilter },
        }),

        prisma.customer.groupBy({
            by: ['pipelineStage'],
            where: { deletedAt: null, ...branchFilter },
            _count: true,
        }),

        prisma.quotation.aggregate({
            _count: true,
            _sum: { grandTotal: true },
            where: {
                createdAt: { gte: startOfYear },
                deletedAt: null,
                customer: { ...branchFilter },
            },
        }),

        prisma.contract.aggregate({
            _count: true,
            _sum: { contractValue: true },
            where: {
                createdAt: { gte: startOfYear },
                deletedAt: null,
                customer: { ...branchFilter },
            },
        }),

        prisma.customer.findMany({
            where: { deletedAt: null, ...branchFilter },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true, code: true, name: true, phone: true,
                pipelineStage: true, source: true, salesPerson: true,
                estimatedValue: true, createdAt: true,
            },
        }),

        prisma.customer.findMany({
            where: {
                deletedAt: null,
                ...branchFilter,
                nextFollowUp: { gte: now, lte: next7Days },
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
