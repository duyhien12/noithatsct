import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { description, unit, quantity, unitPrice, notes, acceptedAt } = body;
    if (!description?.trim()) return NextResponse.json({ error: 'Tên hạng mục bắt buộc' }, { status: 400 });

    const payment = await prisma.contractorPayment.findUnique({ where: { id }, select: { id: true } });
    if (!payment) return NextResponse.json({ error: 'Không tìm thấy phiếu thanh toán' }, { status: 404 });

    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const amount = qty * price;

    const item = await prisma.contractorPaymentItem.create({
        data: {
            contractorPaymentId: id,
            description: description.trim(),
            unit: unit || '',
            quantity: qty,
            unitPrice: price,
            amount,
            notes: notes || '',
            acceptedAt: acceptedAt ? new Date(acceptedAt) : new Date(),
        },
    });

    // Recalculate contractAmount from sum of all items
    const agg = await prisma.contractorPaymentItem.aggregate({
        where: { contractorPaymentId: id },
        _sum: { amount: true },
    });
    await prisma.contractorPayment.update({
        where: { id },
        data: { contractAmount: agg._sum.amount || 0 },
    });

    return NextResponse.json(item, { status: 201 });
});
