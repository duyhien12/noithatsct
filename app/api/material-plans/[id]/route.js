import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { quantity, unitPrice, budgetUnitPrice, orderedQty, receivedQty, status, type, notes, actualCost, costType, group1, group2, supplierTag } = body;

    const update = {};
    if (quantity !== undefined) update.quantity = Number(quantity);
    if (unitPrice !== undefined) update.unitPrice = Number(unitPrice);
    if (budgetUnitPrice !== undefined) update.budgetUnitPrice = Number(budgetUnitPrice);
    if (orderedQty !== undefined) update.orderedQty = Number(orderedQty);
    if (receivedQty !== undefined) update.receivedQty = Number(receivedQty);
    if (status !== undefined) update.status = status;
    if (type !== undefined) update.type = type;
    if (notes !== undefined) update.notes = notes;
    if (actualCost !== undefined) update.actualCost = Number(actualCost);
    if (costType !== undefined) update.costType = costType;
    if (group1 !== undefined) update.group1 = group1;
    if (group2 !== undefined) update.group2 = group2;
    if (supplierTag !== undefined) update.supplierTag = supplierTag;

    // Recompute totalAmount and budgetUnitPrice sync
    if (quantity !== undefined || unitPrice !== undefined || budgetUnitPrice !== undefined) {
        const current = await prisma.materialPlan.findUnique({ where: { id } });
        const q = quantity !== undefined ? Number(quantity) : current.quantity;
        const u = unitPrice !== undefined ? Number(unitPrice) : (budgetUnitPrice !== undefined ? Number(budgetUnitPrice) : current.unitPrice);
        update.totalAmount = q * u;
        if (budgetUnitPrice !== undefined) update.unitPrice = Number(budgetUnitPrice);
    }

    const plan = await prisma.materialPlan.update({ where: { id }, data: update });
    return NextResponse.json(plan);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.materialPlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
