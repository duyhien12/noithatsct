import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PUT: Approve workflow steps
// pending_technical → pending_accounting → approved → paid
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { action, approvedBy = '' } = await request.json();

    const payment = await prisma.contractorPayment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const transitions = {
        approve_technical: { from: 'pending_technical', to: 'pending_accounting' },
        approve_accounting: { from: 'pending_accounting', to: 'approved' },
        mark_paid: { from: 'approved', to: 'paid' },
        reject: { from: null, to: 'rejected' }, // can reject from any non-paid status
    };

    const transition = transitions[action];
    if (!transition) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    if (action === 'reject') {
        if (payment.status === 'paid') return NextResponse.json({ error: 'Không thể từ chối phiếu đã thanh toán' }, { status: 400 });
    } else if (payment.status !== transition.from) {
        return NextResponse.json({ error: `Trạng thái hiện tại không hợp lệ cho thao tác này` }, { status: 400 });
    }

    const data = { status: transition.to, approvedBy };
    if (action === 'approve_technical' || action === 'approve_accounting') {
        data.approvedAt = new Date();
    }
    if (action === 'mark_paid') {
        data.paidAmount = payment.contractAmount;
    }

    const updated = await prisma.contractorPayment.update({ where: { id }, data, include: { items: true } });
    return NextResponse.json(updated);
});
