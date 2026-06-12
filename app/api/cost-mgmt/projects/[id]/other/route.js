import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, newId, toNum } from '@/lib/costMgmt';

export const POST = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    const b = await req.json();
    const rowId = newId();
    const qty = toNum(b.qty), price = toNum(b.unitPrice);
    const amount = Math.round(qty * price);
    await prisma.$executeRaw`
        INSERT INTO "CostOther" ("id","costProjectId","name","unit","qty","unitPrice","amount","sortOrder")
        VALUES (${rowId},${id},${b.name||''},${b.unit||''},${qty},${price},${amount},${toNum(b.sortOrder)})
    `;
    return NextResponse.json({ id: rowId, amount });
});

export const PUT = withAuth(async (req) => {
    await ensureTables();
    const b = await req.json();
    const qty = toNum(b.qty), price = toNum(b.unitPrice);
    const amount = Math.round(qty * price);
    await prisma.$executeRaw`
        UPDATE "CostOther" SET "name"=${b.name||''},"unit"=${b.unit||''},"qty"=${qty},"unitPrice"=${price},"amount"=${amount}
        WHERE id=${b.id}
    `;
    return NextResponse.json({ ok: true, amount });
});

export const DELETE = withAuth(async (req) => {
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const rowId = searchParams.get('rowId');
    if (!rowId) return NextResponse.json({ error: 'rowId required' }, { status: 400 });
    await prisma.$executeRaw`DELETE FROM "CostOther" WHERE id=${rowId}`;
    return NextResponse.json({ ok: true });
});
