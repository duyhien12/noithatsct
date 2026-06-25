import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';

    const where = { branch: 'LC', deletedAt: null };
    if (!all) where.nextFollowUp = { not: null };

    const customers = await prisma.customer.findMany({
        where,
        orderBy: { nextFollowUp: 'asc' },
        take: 100,
        select: {
            id: true, code: true, name: true, phone: true,
            pipelineStage: true, salesPerson: true,
            nextFollowUp: true, notes: true, estimatedValue: true,
        },
    });
    return Response.json({ customers });
});
