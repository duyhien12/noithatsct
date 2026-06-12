import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, newId, toNum, calcTotals } from '@/lib/costMgmt';

export const GET = withAuth(async () => {
    await ensureTables();
    const projects = await prisma.$queryRaw`SELECT * FROM "CostProject" ORDER BY "createdAt" DESC`;
    const result = [];
    for (const p of projects) {
        const [mats, labs, oths, allocs] = await Promise.all([
            prisma.$queryRaw`SELECT amount FROM "CostMaterial" WHERE "costProjectId" = ${p.id}`,
            prisma.$queryRaw`SELECT amount FROM "CostLabor" WHERE "costProjectId" = ${p.id}`,
            prisma.$queryRaw`SELECT amount FROM "CostOther" WHERE "costProjectId" = ${p.id}`,
            prisma.$queryRaw`SELECT amount, type FROM "CostAllocation" WHERE "costProjectId" = ${p.id}`,
        ]);
        const t = calcTotals(p, mats, labs, oths, allocs);
        result.push({ ...p, revenue: toNum(p.revenue), vatPct: toNum(p.vatPct), commissionPct: toNum(p.commissionPct), mgmtPct: toNum(p.mgmtPct), ...t });
    }
    return NextResponse.json(result);
});

export const POST = withAuth(async (request) => {
    await ensureTables();
    const b = await request.json();
    const id = newId();

    // Lấy settings mặc định
    const [settings] = await prisma.$queryRaw`SELECT * FROM "CostSettings" WHERE id = 'default'`.catch(() => [null]);

    await prisma.$executeRaw`
        INSERT INTO "CostProject" ("id","projectId","code","name","client","signDate","revenue","vatPct","commissionPct","mgmtPct","status","notes")
        VALUES (${id}, ${b.projectId || null}, ${b.code || ''}, ${b.name || ''}, ${b.client || ''},
                ${b.signDate || null}, ${toNum(b.revenue)},
                ${toNum(b.vatPct) || toNum(settings?.vatPct) || 0.08},
                ${toNum(b.commissionPct) || toNum(settings?.commissionPct) || 0.05},
                ${toNum(b.mgmtPct) || toNum(settings?.mgmtPct) || 0.04},
                ${b.status || 'Báo giá'}, ${b.notes || ''})
    `;
    return NextResponse.json({ id });
});
