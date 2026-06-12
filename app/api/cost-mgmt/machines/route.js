import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, newId, toNum } from '@/lib/costMgmt';

export const GET = withAuth(async () => {
    await ensureTables();
    const machines = await prisma.$queryRaw`SELECT * FROM "CostMachine" ORDER BY "createdAt"`;
    return NextResponse.json(machines.map(m => ({
        ...m,
        originalCost: toNum(m.originalCost),
        depreciationYears: toNum(m.depreciationYears),
        monthlyDepreciation: toNum(m.monthlyDepreciation),
    })));
});

export const POST = withAuth(async (req) => {
    await ensureTables();
    const b = await req.json();
    const id = newId();
    const originalCost = toNum(b.originalCost);
    const years = toNum(b.depreciationYears) || 5;
    const monthlyDepreciation = years > 0 ? Math.round(originalCost / (years * 12)) : 0;
    await prisma.$executeRaw`
        INSERT INTO "CostMachine" ("id","name","startDate","originalCost","depreciationYears","monthlyDepreciation","note","status")
        VALUES (${id},${b.name||''},${b.startDate||null},${originalCost},${years},${monthlyDepreciation},${b.note||''},${b.status||'Đang dùng'})
    `;
    return NextResponse.json({ id, monthlyDepreciation });
});
