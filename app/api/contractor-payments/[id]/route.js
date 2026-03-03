import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { contractAmount, paidAmount, description, dueDate, status } = body;
    const updated = await prisma.contractorPayment.update({
        where: { id },
        data: {
            ...(contractAmount !== undefined && { contractAmount: Number(contractAmount) }),
            ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
            ...(description !== undefined && { description }),
            ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
            ...(status !== undefined && { status }),
        },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.contractorPayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
