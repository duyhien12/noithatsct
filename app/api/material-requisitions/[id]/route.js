import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { status, purchaseOrderId } = body;

    const req = await prisma.materialRequisition.update({
        where: { id },
        data: {
            ...(status && { status }),
            ...(purchaseOrderId !== undefined && { purchaseOrderId }),
        },
    });

    return NextResponse.json(req);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.materialRequisition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
