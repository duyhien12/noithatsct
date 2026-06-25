import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async () => {
    try {
        const lcCustomers = await prisma.customer.findMany({ where: { branch: 'LC', deletedAt: null }, select: { id: true } });
        const ids = lcCustomers.map(c => c.id);
        if (!ids.length) return Response.json({ contracts: [] });

        const contracts = await prisma.contract.findMany({
            where: { customerId: { in: ids }, deletedAt: null },
            include: { customer: { select: { name: true, code: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return Response.json({ contracts });
    } catch (err) {
        console.error('[laocai/contracts GET]', err);
        return Response.json({ error: 'Lỗi tải hợp đồng' }, { status: 500 });
    }
});
