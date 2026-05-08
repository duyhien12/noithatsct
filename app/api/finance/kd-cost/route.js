import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    const entries = await prisma.$queryRaw`
        SELECT "rowKey", "month"::int AS "month", "amount"
        FROM "KdCostEntry"
        WHERE "year" = ${year}
    `;

    return Response.json({ entries });
});

export const POST = withAuth(async (req) => {
    const { year, entries } = await req.json();
    if (!year || !Array.isArray(entries)) {
        return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    for (const { rowKey, month, amount } of entries) {
        const m = Number(month);
        const a = Number(amount) || 0;
        await prisma.$executeRaw`
            INSERT INTO "KdCostEntry" ("year", "month", "rowKey", "amount", "updatedAt", "createdAt")
            VALUES (${year}, ${m}, ${rowKey}, ${a}, NOW(), NOW())
            ON CONFLICT ("year", "month", "rowKey")
            DO UPDATE SET "amount" = ${a}, "updatedAt" = NOW()
        `;
    }

    return Response.json({ ok: true });
}, { roles: ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt', 'kinh_doanh'] });
