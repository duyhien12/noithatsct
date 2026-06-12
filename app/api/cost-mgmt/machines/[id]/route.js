import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, toNum } from '@/lib/costMgmt';

export const PUT = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    const b = await req.json();
    const originalCost = toNum(b.originalCost);
    const years = toNum(b.depreciationYears) || 5;
    const monthlyDepreciation = years > 0 ? Math.round(originalCost / (years * 12)) : 0;
    await prisma.$executeRaw`
        UPDATE "CostMachine" SET "name"=${b.name||''},"startDate"=${b.startDate||null},
        "originalCost"=${originalCost},"depreciationYears"=${years},
        "monthlyDepreciation"=${monthlyDepreciation},"note"=${b.note||''},"status"=${b.status||'Đang dùng'}
        WHERE id=${id}
    `;
    return NextResponse.json({ ok: true, monthlyDepreciation });
});

export const DELETE = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    await prisma.$executeRaw`DELETE FROM "CostMachine" WHERE id=${id}`;
    return NextResponse.json({ ok: true });
});
