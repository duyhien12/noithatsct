import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { quantity, unitPrice, orderedQty, receivedQty, status, type, notes } = body;

    const update = {};
    if (quantity !== undefined) update.quantity = Number(quantity);
    if (unitPrice !== undefined) update.unitPrice = Number(unitPrice);
    if (orderedQty !== undefined) update.orderedQty = Number(orderedQty);
    if (receivedQty !== undefined) update.receivedQty = Number(receivedQty);
    if (status !== undefined) update.status = status;
    if (type !== undefined) update.type = type;
    if (notes !== undefined) update.notes = notes;

    // Recompute totalAmount when quantity or unitPrice changes
    if (quantity !== undefined || unitPrice !== undefined) {
        const current = await prisma.materialPlan.findUnique({ where: { id } });
        const q = quantity !== undefined ? Number(quantity) : current.quantity;
        const u = unitPrice !== undefined ? Number(unitPrice) : current.unitPrice;
        update.totalAmount = q * u;
    }

    const plan = await prisma.materialPlan.update({ where: { id }, data: update });
    return NextResponse.json(plan);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.materialPlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
