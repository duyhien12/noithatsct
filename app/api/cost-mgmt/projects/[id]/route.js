import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, toNum, calcTotals } from '@/lib/costMgmt';

export const GET = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    const [rows] = await prisma.$queryRaw`SELECT * FROM "CostProject" WHERE id = ${id}`;
    if (!rows) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [materials, labor, other, allocations] = await Promise.all([
        prisma.$queryRaw`SELECT * FROM "CostMaterial" WHERE "costProjectId" = ${id} ORDER BY "sortOrder","createdAt"`,
        prisma.$queryRaw`SELECT * FROM "CostLabor" WHERE "costProjectId" = ${id} ORDER BY "sortOrder","createdAt"`,
        prisma.$queryRaw`SELECT * FROM "CostOther" WHERE "costProjectId" = ${id} ORDER BY "sortOrder","createdAt"`,
        prisma.$queryRaw`SELECT * FROM "CostAllocation" WHERE "costProjectId" = ${id} ORDER BY "createdAt"`,
    ]);

    const project = { ...rows, revenue: toNum(rows.revenue), vatPct: toNum(rows.vatPct), commissionPct: toNum(rows.commissionPct), mgmtPct: toNum(rows.mgmtPct) };
    const totals = calcTotals(project, materials, labor, other, allocations);

    return NextResponse.json({ project, materials, labor, other, allocations, totals });
});

export const PUT = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    const b = await req.json();
    await prisma.$executeRaw`
        UPDATE "CostProject" SET
            "code"=${b.code||''}, "name"=${b.name||''}, "client"=${b.client||''},
            "signDate"=${b.signDate||null}, "revenue"=${toNum(b.revenue)},
            "vatPct"=${toNum(b.vatPct)}, "commissionPct"=${toNum(b.commissionPct)},
            "mgmtPct"=${toNum(b.mgmtPct)}, "status"=${b.status||'Báo giá'},
            "notes"=${b.notes||''}
        WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    await Promise.all([
        prisma.$executeRaw`DELETE FROM "CostMaterial" WHERE "costProjectId"=${id}`,
        prisma.$executeRaw`DELETE FROM "CostLabor" WHERE "costProjectId"=${id}`,
        prisma.$executeRaw`DELETE FROM "CostOther" WHERE "costProjectId"=${id}`,
        prisma.$executeRaw`DELETE FROM "CostAllocation" WHERE "costProjectId"=${id}`,
    ]);
    await prisma.$executeRaw`DELETE FROM "CostProject" WHERE id=${id}`;
    return NextResponse.json({ ok: true });
});
