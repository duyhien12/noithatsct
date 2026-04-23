import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, context) => {
    const id = context.params.id;
    const body = await request.json();
    const qty = Number(body.quantity) || 0;
    const price = Number(body.unitPrice) || 0;
    const amount = Number(body.productionAmount) !== undefined ? Number(body.productionAmount) : qty * price;

    await prisma.$executeRaw`
        UPDATE "ProductionCostItem" SET
            "groupName"        = ${body.groupName ?? ''},
            "groupOrder"       = ${Number(body.groupOrder) || 0},
            "sortOrder"        = ${Number(body.sortOrder) || 0},
            "name"             = ${body.name ?? ''},
            "productCode"      = ${body.productCode ?? ''},
            "spec"             = ${body.spec ?? ''},
            "unit"             = ${body.unit ?? ''},
            "quantity"         = ${qty},
            "dimLength"        = ${Number(body.dimLength) || 0},
            "dimWidth"         = ${Number(body.dimWidth) || 0},
            "dimHeight"        = ${Number(body.dimHeight) || 0},
            "dimTotal"         = ${Number(body.dimTotal) || 0},
            "unitPrice"        = ${price},
            "productionAmount" = ${amount},
            "salePrice"        = ${Number(body.salePrice) || 0}
        WHERE "id" = ${id}
    `;
    return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (request, context) => {
    const id = context.params.id;
    await prisma.$executeRaw`DELETE FROM "ProductionCostItem" WHERE "id" = ${id}`;
    return NextResponse.json({ ok: true });
});
