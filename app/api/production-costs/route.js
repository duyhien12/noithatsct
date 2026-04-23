import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Ensure table exists (idempotent)
async function ensureTable() {
    await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "ProductionCostItem" (
            "id"               TEXT NOT NULL PRIMARY KEY,
            "projectId"        TEXT NOT NULL,
            "groupName"        TEXT NOT NULL DEFAULT '',
            "groupOrder"       INTEGER NOT NULL DEFAULT 0,
            "sortOrder"        INTEGER NOT NULL DEFAULT 0,
            "name"             TEXT NOT NULL DEFAULT '',
            "productCode"      TEXT NOT NULL DEFAULT '',
            "spec"             TEXT NOT NULL DEFAULT '',
            "unit"             TEXT NOT NULL DEFAULT '',
            "quantity"         DOUBLE PRECISION NOT NULL DEFAULT 0,
            "dimLength"        DOUBLE PRECISION NOT NULL DEFAULT 0,
            "dimWidth"         DOUBLE PRECISION NOT NULL DEFAULT 0,
            "dimHeight"        DOUBLE PRECISION NOT NULL DEFAULT 0,
            "dimTotal"         DOUBLE PRECISION NOT NULL DEFAULT 0,
            "unitPrice"        DOUBLE PRECISION NOT NULL DEFAULT 0,
            "productionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "salePrice"        DOUBLE PRECISION NOT NULL DEFAULT 0,
            "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `.catch(() => {});
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ProductionCostItem_projectId_idx" ON "ProductionCostItem"("projectId")`.catch(() => {});
}

export const GET = withAuth(async (request) => {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const items = await prisma.$queryRaw`
        SELECT * FROM "ProductionCostItem"
        WHERE "projectId" = ${projectId}
        ORDER BY "groupOrder" ASC, "sortOrder" ASC, "createdAt" ASC
    `;

    return NextResponse.json(items.map(i => ({
        ...i,
        quantity: Number(i.quantity),
        dimLength: Number(i.dimLength),
        dimWidth: Number(i.dimWidth),
        dimHeight: Number(i.dimHeight),
        dimTotal: Number(i.dimTotal),
        unitPrice: Number(i.unitPrice),
        productionAmount: Number(i.productionAmount),
        salePrice: Number(i.salePrice),
        groupOrder: Number(i.groupOrder),
        sortOrder: Number(i.sortOrder),
    })));
});

export const POST = withAuth(async (request) => {
    await ensureTable();
    const body = await request.json();
    const { projectId, items } = body;
    if (!projectId || !Array.isArray(items)) return NextResponse.json({ error: 'projectId và items required' }, { status: 400 });

    const { createId } = await import('@paralleldrive/cuid2').catch(() => ({ createId: () => Math.random().toString(36).slice(2) }));

    const created = [];
    for (const item of items) {
        const id = typeof createId === 'function' ? createId() : Math.random().toString(36).slice(2) + Date.now().toString(36);
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const amount = Number(item.productionAmount) || qty * price;
        await prisma.$executeRaw`
            INSERT INTO "ProductionCostItem"
                ("id","projectId","groupName","groupOrder","sortOrder","name","productCode","spec","unit",
                 "quantity","dimLength","dimWidth","dimHeight","dimTotal","unitPrice","productionAmount","salePrice")
            VALUES (
                ${id}, ${projectId},
                ${item.groupName || ''}, ${Number(item.groupOrder) || 0}, ${Number(item.sortOrder) || 0},
                ${item.name || ''}, ${item.productCode || ''}, ${item.spec || ''}, ${item.unit || ''},
                ${qty}, ${Number(item.dimLength) || 0}, ${Number(item.dimWidth) || 0},
                ${Number(item.dimHeight) || 0}, ${Number(item.dimTotal) || 0},
                ${price}, ${amount}, ${Number(item.salePrice) || 0}
            )
        `;
        created.push(id);
    }

    return NextResponse.json({ created: created.length });
});

export const DELETE = withAuth(async (request) => {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    await prisma.$executeRaw`DELETE FROM "ProductionCostItem" WHERE "projectId" = ${projectId}`;
    return NextResponse.json({ ok: true });
});
