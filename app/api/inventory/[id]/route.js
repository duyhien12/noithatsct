import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = await request.json();

    const old = await prisma.inventoryTransaction.findUnique({ where: { id } });
    if (!old) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    const newQty = Number(data.quantity) || old.quantity;
    const newType = data.type || old.type;

    // Reverse old stock effect, apply new
    const oldDelta = old.type === 'Nhập' ? -old.quantity : old.quantity;
    const newDelta = newType === 'Nhập' ? newQty : -newQty;

    const [tx] = await prisma.$transaction([
        prisma.inventoryTransaction.update({
            where: { id },
            data: {
                type: newType,
                quantity: newQty,
                unit: data.unit ?? old.unit,
                note: data.note ?? old.note,
                date: data.date ? new Date(data.date + 'T00:00:00') : old.date,
                warehouseId: data.warehouseId || old.warehouseId,
                projectId: data.projectId !== undefined ? (data.projectId || null) : old.projectId,
            },
            include: { product: { select: { name: true } }, warehouse: { select: { name: true } }, project: { select: { name: true } } },
        }),
        prisma.product.update({ where: { id: old.productId }, data: { stock: { increment: oldDelta + newDelta } } }),
    ]);

    return NextResponse.json(tx);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const tx = await prisma.inventoryTransaction.findUnique({ where: { id } });
    if (!tx) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    // Reverse the stock change
    const delta = tx.type === 'Nhập' ? -tx.quantity : tx.quantity;

    await prisma.$transaction([
        prisma.inventoryTransaction.delete({ where: { id } }),
        prisma.product.update({ where: { id: tx.productId }, data: { stock: { increment: delta } } }),
    ]);

    return NextResponse.json({ success: true });
});
