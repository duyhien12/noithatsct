import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { receivableSinglePaySchema } from '@/lib/validations/receivable';
import { createCollectionTransaction, CREATE_ROLES } from '@/lib/receivable';
import { findAccountByCode } from '@/lib/financeJournal';

// Xác nhận thu 1 đợt thanh toán — dùng chung bởi /payments, /finance, /workshop/expenses,
// /sales/expenses và nút "Thu tiền" trong /contracts/[id]. TẠO ĐÚNG 1 FinanceTransaction (Thu) +
// PaymentAllocation qua createCollectionTransaction() — không còn cho ghi thẳng paidAmount
// (tránh treo công nợ ảo / ghi trùng dòng tiền, xem lib/receivable.js).
export const PUT = withAuth(async (request, { params }, session) => {
    const { id: contractId, paymentId } = await params;
    const body = await request.json();
    const data = receivableSinglePaySchema.parse(body);

    const payment = await prisma.contractPayment.findFirst({ where: { id: paymentId, contractId } });
    if (!payment) return NextResponse.json({ error: 'Không tìm thấy đợt thanh toán' }, { status: 404 });

    const remaining = payment.amount - payment.paidAmount;
    if (data.amount > remaining + 0.01) {
        return NextResponse.json({ error: `Số tiền thu (${data.amount.toLocaleString('vi-VN')}) vượt quá số còn phải thu của đợt này (${remaining.toLocaleString('vi-VN')})` }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: { customer: { select: { id: true, name: true } } } });
    if (!contract) return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });

    const debitAccountId = await findAccountByCode(data.method === 'Tiền mặt' ? '111' : '112');
    const creditAccountId = await findAccountByCode('131');
    if (!debitAccountId || !creditAccountId) {
        return NextResponse.json({ error: 'Thiếu tài khoản kế toán mặc định (111/112/131) — vào Nhật ký Thu – Chi > Danh mục để tạo trước' }, { status: 400 });
    }

    const financeTx = await prisma.$transaction(async (tx) => createCollectionTransaction(tx, withCodeRetry, {
        customerId: contract.customer.id, customerName: contract.customer.name, projectId: contract.projectId,
        date: data.date || new Date(), amount: data.amount, method: data.method,
        bankAccountId: data.bankAccountId, cashFundId: data.cashFundId,
        debitAccountId, creditAccountId,
        department: 'Kinh doanh', content: `Thu tiền đợt "${payment.phase}" — HĐ ${contract.code}`,
        detail: contract.customer.name,
        attachments: data.proofUrl ? [{ url: data.proofUrl, name: 'Xác nhận thanh toán' }] : [],
        notes: data.notes,
        actor: { name: session.user.name, id: session.user.id, role: session.user.role },
        allocations: [{ contractPaymentId: paymentId, amount: data.amount }],
    }));

    const updated = await prisma.contractPayment.findUnique({ where: { id: paymentId } });
    return NextResponse.json({ ...updated, financeTransaction: financeTx });
}, { roles: CREATE_ROLES });
