import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    if (!month) return Response.json({ error: 'month required' }, { status: 400 });

    const advances = await prisma.$queryRawUnsafe(
        `SELECT "workerId", amount, notes FROM "WorkerSalaryAdvance" WHERE month = $1`,
        month
    );
    return Response.json(advances.map(a => ({ ...a, amount: Number(a.amount) })));
});

export const POST = withAuth(async (req) => {
    const { workerId, month, amount, notes } = await req.json();
    if (!workerId || !month) return Response.json({ error: 'workerId and month required' }, { status: 400 });

    const id = randomUUID();
    const now = new Date();
    await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkerSalaryAdvance" (id, "workerId", month, amount, notes, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $6)
         ON CONFLICT ("workerId", month) DO UPDATE SET amount = $4, notes = $5, "updatedAt" = $6`,
        id, workerId, month, amount || 0, notes || '', now
    );
    return Response.json({ workerId, month, amount: amount || 0 });
});
