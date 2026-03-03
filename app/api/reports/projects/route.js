import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const [projects, cpStats, poStats] = await Promise.all([
        prisma.project.findMany({
            where: { deletedAt: null },
            select: {
                id: true, code: true, name: true, status: true, type: true,
                contractValue: true, paidAmount: true, budget: true,
                customer: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.contractorPayment.groupBy({
            by: ['projectId'],
            _sum: { contractAmount: true, paidAmount: true },
        }),
        prisma.purchaseOrder.groupBy({
            by: ['projectId'],
            _sum: { totalAmount: true, paidAmount: true },
            where: { projectId: { not: null } },
        }),
    ]);

    const cpMap = Object.fromEntries(cpStats.map(s => [s.projectId, s._sum]));
    const poMap = Object.fromEntries(poStats.map(s => [s.projectId, s._sum]));

    const result = projects.map(p => ({
        ...p,
        contractorCost: cpMap[p.id]?.contractAmount || 0,
        contractorPaid: cpMap[p.id]?.paidAmount || 0,
        poCost: poMap[p.id]?.totalAmount || 0,
        poPaid: poMap[p.id]?.paidAmount || 0,
    }));

    return NextResponse.json(result);
});
