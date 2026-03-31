import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true, project: { select: { name: true, code: true, address: true } } },
    });
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(po);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { status, paidAmount, deliveryType, deliveryAddress, notes, deliveryDate, supplier, supplierId, items } = body;

    // If items are provided, replace all items and recalculate totalAmount
    if (items !== undefined) {
        const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const updated = await prisma.$transaction(async (tx) => {
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            return tx.purchaseOrder.update({
                where: { id },
                data: {
                    ...(supplier !== undefined && { supplier }),
                    ...(supplierId !== undefined && { supplierId: supplierId || null }),
                    totalAmount,
                    ...(status !== undefined && { status }),
                    ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
                    ...(deliveryType !== undefined && { deliveryType }),
                    ...(deliveryAddress !== undefined && { deliveryAddress }),
                    ...(notes !== undefined && { notes }),
                    ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
                    items: {
                        create: items.map(i => ({
                            productName: i.productName || '',
                            unit: i.unit || '',
                            quantity: Number(i.quantity) || 0,
                            unitPrice: Number(i.unitPrice) || 0,
                            amount: Number(i.amount) || 0,
                            notes: i.notes || '',
                            productId: i.productId || null,
                            materialPlanId: i.materialPlanId || null,
                        })),
                    },
                },
                include: { items: true },
            });
        });
        return NextResponse.json(updated);
    }

    const po = await prisma.purchaseOrder.update({
        where: { id },
        data: {
            ...(supplier !== undefined && { supplier }),
            ...(supplierId !== undefined && { supplierId: supplierId || null }),
            ...(status !== undefined && { status }),
            ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
            ...(deliveryType !== undefined && { deliveryType }),
            ...(deliveryAddress !== undefined && { deliveryAddress }),
            ...(notes !== undefined && { notes }),
            ...(deliveryDate !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
        },
        include: { items: true },
    });
    return NextResponse.json(po);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await prisma.$transaction([
        prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } }),
        prisma.purchaseOrder.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
});
