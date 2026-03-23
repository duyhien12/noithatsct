import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();

    // Ensure columns exist (idempotent migration)
    await prisma.$executeRaw`ALTER TABLE "MaterialPlan" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT ''`.catch(() => {});
    await prisma.$executeRaw`ALTER TABLE "MaterialPlan" ADD COLUMN IF NOT EXISTS "actualQty" FLOAT NOT NULL DEFAULT 0`.catch(() => {});

    const sets = [];
    const vals = [];
    let idx = 1;

    const add = (col, val) => { sets.push(`"${col}" = $${idx++}`); vals.push(val); };

    if (body.quantity !== undefined)       add('quantity', Number(body.quantity));
    if (body.unitPrice !== undefined)      add('unitPrice', Number(body.unitPrice));
    if (body.budgetUnitPrice !== undefined) {
        add('budgetUnitPrice', Number(body.budgetUnitPrice));
        add('unitPrice', Number(body.budgetUnitPrice));
    }
    if (body.actualCost !== undefined)     add('actualCost', Number(body.actualCost));
    if (body.orderedQty !== undefined)     add('orderedQty', Number(body.orderedQty));
    if (body.receivedQty !== undefined)    add('receivedQty', Number(body.receivedQty));
    if (body.status !== undefined)         add('status', body.status);
    if (body.type !== undefined)           add('type', body.type);
    if (body.notes !== undefined)          add('notes', body.notes);
    if (body.costType !== undefined)       add('costType', body.costType);
    if (body.group1 !== undefined)         add('group1', body.group1);
    if (body.group2 !== undefined)         add('group2', body.group2);
    if (body.supplierTag !== undefined)    add('supplierTag', body.supplierTag);
    if (body.category !== undefined)       add('category', body.category);
    if (body.unit !== undefined)           add('unit', body.unit);
    if (body.actualQty !== undefined)      add('actualQty', Number(body.actualQty));

    // Recompute totalAmount if quantity or price changed
    if (body.quantity !== undefined || body.unitPrice !== undefined || body.budgetUnitPrice !== undefined) {
        const rows = await prisma.$queryRaw`SELECT quantity, "unitPrice" FROM "MaterialPlan" WHERE id = ${id}`;
        const cur = rows[0] || {};
        const q = body.quantity !== undefined ? Number(body.quantity) : Number(cur.quantity);
        const u = body.budgetUnitPrice !== undefined ? Number(body.budgetUnitPrice)
                : body.unitPrice !== undefined ? Number(body.unitPrice)
                : Number(cur.unitPrice);
        sets.push(`"totalAmount" = $${idx++}`);
        vals.push(q * u);
    }

    if (!sets.length) return NextResponse.json({ ok: true });

    vals.push(id);
    await prisma.$executeRawUnsafe(
        `UPDATE "MaterialPlan" SET ${sets.join(', ')} WHERE id = $${idx}`,
        ...vals
    );

    const rows = await prisma.$queryRaw`SELECT * FROM "MaterialPlan" WHERE id = ${id}`;
    return NextResponse.json(rows[0] || {});
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.$executeRaw`DELETE FROM "MaterialPlan" WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
});
