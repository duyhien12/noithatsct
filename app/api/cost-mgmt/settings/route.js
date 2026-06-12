import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, toNum } from '@/lib/costMgmt';

export const GET = withAuth(async () => {
    await ensureTables();
    const [s] = await prisma.$queryRaw`SELECT * FROM "CostSettings" WHERE id='default'`.catch(() => [null]);
    return NextResponse.json(s || { id: 'default', vatPct: 0.08, targetProfitPct: 0.18, commissionPct: 0.05, mgmtPct: 0.04 });
});

export const PUT = withAuth(async (req) => {
    await ensureTables();
    const b = await req.json();
    const vatPct = toNum(b.vatPct), targetProfitPct = toNum(b.targetProfitPct);
    const commissionPct = toNum(b.commissionPct), mgmtPct = toNum(b.mgmtPct);

    const [existing] = await prisma.$queryRaw`SELECT id FROM "CostSettings" WHERE id='default'`.catch(() => [null]);
    if (existing) {
        await prisma.$executeRaw`
            UPDATE "CostSettings" SET "vatPct"=${vatPct},"targetProfitPct"=${targetProfitPct},
            "commissionPct"=${commissionPct},"mgmtPct"=${mgmtPct},"updatedAt"=CURRENT_TIMESTAMP
            WHERE id='default'
        `;
    } else {
        await prisma.$executeRaw`
            INSERT INTO "CostSettings" ("id","vatPct","targetProfitPct","commissionPct","mgmtPct")
            VALUES ('default',${vatPct},${targetProfitPct},${commissionPct},${mgmtPct})
        `;
    }
    return NextResponse.json({ ok: true });
});
