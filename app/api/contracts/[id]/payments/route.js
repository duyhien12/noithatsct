import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

async function syncCustomerRevenue(contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { customerId: true } });
    if (!contract?.customerId) return;
    const result = await prisma.contract.aggregate({ where: { customerId: contract.customerId }, _sum: { paidAmount: true } });
    await prisma.customer.update({ where: { id: contract.customerId }, data: { totalRevenue: result._sum.paidAmount || 0 } });
}

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = await request.json();
    const payment = await prisma.contractPayment.create({
        data: { contractId: id, ...data },
    });
    const total = await prisma.contractPayment.aggregate({ where: { contractId: id }, _sum: { paidAmount: true } });
    await prisma.contract.update({ where: { id }, data: { paidAmount: total._sum.paidAmount || 0 } });
    await syncCustomerRevenue(id);
    return NextResponse.json(payment);
});

// Batch replace all payment phases
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { phases } = await request.json();
    // Delete existing
    await prisma.contractPayment.deleteMany({ where: { contractId: id } });
    // Create new
    if (phases?.length > 0) {
        await prisma.contractPayment.createMany({
            data: phases.map(p => ({
                contractId: id,
                phase: p.phase || '',
                amount: Number(p.amount) || 0,
                paidAmount: Number(p.paidAmount) || 0,
                category: p.category || '',
                status: p.status || 'Chưa thu',
                notes: p.notes || '',
            })),
        });
    }
    const [payments, total] = await Promise.all([
        prisma.contractPayment.findMany({ where: { contractId: id }, orderBy: { createdAt: 'asc' } }),
        prisma.contractPayment.aggregate({ where: { contractId: id }, _sum: { paidAmount: true } }),
    ]);
    await prisma.contract.update({ where: { id }, data: { paidAmount: total._sum.paidAmount || 0 } });
    await syncCustomerRevenue(id);
    return NextResponse.json(payments);
});
