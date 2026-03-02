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
    const { status, paidAmount, deliveryType, deliveryAddress, notes, deliveryDate } = body;

    const po = await prisma.purchaseOrder.update({
        where: { id },
        data: {
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
