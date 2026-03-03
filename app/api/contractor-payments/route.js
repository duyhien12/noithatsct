import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { contractorId, projectId, contractAmount, paidAmount, description, dueDate, status } = body;
    if (!contractorId) return NextResponse.json({ error: 'contractorId bắt buộc' }, { status: 400 });
    if (!projectId) return NextResponse.json({ error: 'projectId bắt buộc' }, { status: 400 });

    const payment = await prisma.contractorPayment.create({
        data: {
            contractorId,
            projectId,
            contractAmount: Number(contractAmount) || 0,
            paidAmount: Number(paidAmount) || 0,
            description: description || '',
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'Chưa TT',
        },
        include: { contractor: { select: { name: true, type: true, phone: true } } },
    });
    return NextResponse.json(payment, { status: 201 });
});
