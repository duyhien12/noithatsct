import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

// GET /api/sales/salary-advances?month=2026-06
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const where = month ? { month } : {};
    const advances = await prisma.salesSalaryAdvance.findMany({ where, orderBy: { createdAt: 'asc' } });
    return Response.json(advances);
});

// POST /api/sales/salary-advances  { workerId, month, amount, notes }
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { workerId, month, amount, notes } = body;
    if (!workerId || !month) return Response.json({ error: 'Thiếu workerId hoặc month' }, { status: 400 });
    const record = await prisma.salesSalaryAdvance.upsert({
        where: { workerId_month: { workerId, month } },
        update: { amount: parseFloat(amount) || 0, notes: notes || '' },
        create: { workerId, month, amount: parseFloat(amount) || 0, notes: notes || '' },
    });
    return Response.json(record);
});
