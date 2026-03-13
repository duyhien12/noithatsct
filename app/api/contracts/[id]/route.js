import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { contractUpdateSchema } from '@/lib/validations/contract';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
        where: { id },
        include: { customer: true, project: true, quotation: true, payments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(contract);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = contractUpdateSchema.parse(body);

    // Remove paymentPhases from the update data since it's not a direct contract field
    const { paymentPhases, ...contractData } = data;

    const contract = await prisma.contract.update({ where: { id }, data: contractData });
    return NextResponse.json(contract);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;

    const contract = await prisma.contract.findUnique({ where: { id }, select: { customerId: true } });

    await prisma.$transaction(async (tx) => {
        await tx.contractPayment.deleteMany({ where: { contractId: id } });
        await tx.contract.delete({ where: { id } });
    });

    if (contract?.customerId) {
        const result = await prisma.contract.aggregate({ where: { customerId: contract.customerId }, _sum: { paidAmount: true } });
        await prisma.customer.update({ where: { id: contract.customerId }, data: { totalRevenue: result._sum.paidAmount || 0 } });
    }

    return NextResponse.json({ success: true });
});
