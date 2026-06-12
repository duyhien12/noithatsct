import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, newId, toNum } from '@/lib/costMgmt';

export const POST = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    const b = await req.json();
    const rowId = newId();
    const qty = toNum(b.qty), price = toNum(b.unitPrice), waste = toNum(b.wastePct);
    const amount = Math.round(qty * price * (1 + waste));
    await prisma.$executeRaw`
        INSERT INTO "CostMaterial" ("id","costProjectId","grp","name","detail","unit","qty","unitPrice","wastePct","amount","sortOrder")
        VALUES (${rowId},${id},${b.grp||''},${b.name||''},${b.detail||''},${b.unit||''},${qty},${price},${waste},${amount},${toNum(b.sortOrder)})
    `;
    return NextResponse.json({ id: rowId, amount });
});

export const PUT = withAuth(async (req, { params }) => {
    await ensureTables();
    const b = await req.json();
    const qty = toNum(b.qty), price = toNum(b.unitPrice), waste = toNum(b.wastePct);
    const amount = Math.round(qty * price * (1 + waste));
    await prisma.$executeRaw`
        UPDATE "CostMaterial" SET "grp"=${b.grp||''},"name"=${b.name||''},"detail"=${b.detail||''},
        "unit"=${b.unit||''},"qty"=${qty},"unitPrice"=${price},"wastePct"=${waste},"amount"=${amount}
        WHERE id=${b.id}
    `;
    return NextResponse.json({ ok: true, amount });
});

export const DELETE = withAuth(async (req) => {
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const rowId = searchParams.get('rowId');
    if (!rowId) return NextResponse.json({ error: 'rowId required' }, { status: 400 });
    await prisma.$executeRaw`DELETE FROM "CostMaterial" WHERE id=${rowId}`;
    return NextResponse.json({ ok: true });
});
