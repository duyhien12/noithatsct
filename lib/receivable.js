// Công nợ Khách hàng — Số dư đầu kỳ nhập tay (Customer.openingReceivableBalance) trừ "Đã thu
// trong kỳ" tính từ FinanceTransaction (Nhật ký Thu – Chi, objectType='Khách hàng'). Không dùng
// ContractPayment làm nguồn dữ liệu cho module này nữa — chỉ lấy dữ liệu có trong Nhật ký.
// createCollectionTransaction() dưới đây vẫn được GIỮ LẠI — dùng bởi route cũ
// /api/contracts/[id]/payments/[paymentId] (các trang /finance, /workshop/expenses,
// /sales/expenses — đã ẩn khỏi menu nhưng chưa xóa code) để không phá vỡ paidAmount mà nhiều
// trang báo cáo/dashboard khác vẫn đang đọc.

import { deriveCashFields } from '@/lib/financeJournal';

function statusFromBalance(amount, paid) {
    if (paid <= 0.01) return 'Chưa thu';
    if (paid + 0.01 >= amount) return 'Đã thu';
    return 'Thu một phần';
}

async function syncCustomerRevenue(tx, customerId) {
    const result = await tx.contract.aggregate({ where: { customerId }, _sum: { paidAmount: true } });
    await tx.customer.update({ where: { id: customerId }, data: { totalRevenue: result._sum.paidAmount || 0 } });
}

/**
 * Ghi nhận 1 khoản khách hàng thanh toán — tạo ĐÚNG 1 FinanceTransaction (Thu) cho toàn bộ
 * amount, dù allocations phân bổ cho bao nhiêu đợt thanh toán (ContractPayment). Phải chạy
 * trong prisma.$transaction (tx = transaction client).
 *
 * @param {object} tx - Prisma transaction client
 * @param {object} p
 * @param {string} p.customerId
 * @param {string} p.customerName
 * @param {string|null} p.projectId
 * @param {Date} p.date
 * @param {number} p.amount
 * @param {'Tiền mặt'|'Chuyển khoản'} p.method
 * @param {string|null} p.bankAccountId
 * @param {string|null} p.cashFundId
 * @param {string} p.debitAccountId
 * @param {string} p.creditAccountId
 * @param {string} p.department
 * @param {string} p.content
 * @param {string} [p.detail]
 * @param {string} [p.documentNo]
 * @param {Date|null} [p.documentDate]
 * @param {Array} [p.attachments]
 * @param {string} [p.notes]
 * @param {{name:string,id:string,role:string}} p.actor
 * @param {Array<{contractPaymentId:string, amount:number}>} p.allocations
 * @param {import('@/lib/generateCode').withCodeRetry} withCodeRetry
 */
export async function createCollectionTransaction(tx, withCodeRetry, p) {
    const cash = deriveCashFields('Thu', p.method, p.amount);

    const financeTx = await withCodeRetry('financeTransaction', 'PT', (code) =>
        tx.financeTransaction.create({
            data: {
                code,
                date: p.date,
                type: 'Thu',
                method: p.method,
                amount: p.amount,
                ...cash,
                department: p.department,
                projectId: p.projectId || null,
                content: p.content,
                detail: p.detail || '',
                debitAccountId: p.debitAccountId,
                creditAccountId: p.creditAccountId,
                bankAccountId: p.method === 'Chuyển khoản' ? p.bankAccountId : null,
                cashFundId: p.method === 'Tiền mặt' ? p.cashFundId : null,
                objectType: 'Khách hàng',
                objectId: p.customerId,
                objectName: p.customerName,
                documentNo: p.documentNo || '',
                documentDate: p.documentDate || null,
                attachments: p.attachments || [],
                notes: p.notes || '',
                status: 'Đã hạch toán',
                createdBy: p.actor.name,
                createdById: p.actor.id,
                createdByRole: p.actor.role,
            },
        }), 5
    );

    await tx.financeTransactionAudit.create({
        data: {
            transactionId: financeTx.id, action: 'create',
            actorName: p.actor.name, actorId: p.actor.id, actorRole: p.actor.role,
            reason: `Thu tiền khách hàng ${p.customerName}`, afterData: financeTx,
        },
    });

    const touchedContractIds = new Set();
    for (const alloc of p.allocations) {
        await tx.paymentAllocation.create({
            data: { financeTransactionId: financeTx.id, targetType: 'ContractPayment', targetId: alloc.contractPaymentId, amount: alloc.amount },
        });
        const payment = await tx.contractPayment.findUnique({ where: { id: alloc.contractPaymentId } });
        const paidTotal = await tx.paymentAllocation.aggregate({ where: { targetType: 'ContractPayment', targetId: alloc.contractPaymentId }, _sum: { amount: true } });
        const newPaid = paidTotal._sum.amount || 0;
        await tx.contractPayment.update({
            where: { id: alloc.contractPaymentId },
            data: { paidAmount: newPaid, status: statusFromBalance(payment.amount, newPaid), paidDate: p.date },
        });
        touchedContractIds.add(payment.contractId);
    }

    for (const contractId of touchedContractIds) {
        const total = await tx.contractPayment.aggregate({ where: { contractId }, _sum: { paidAmount: true } });
        const contract = await tx.contract.update({ where: { id: contractId }, data: { paidAmount: total._sum.paidAmount || 0 } });
        await syncCustomerRevenue(tx, contract.customerId);
    }

    return financeTx;
}

export { ADMIN_ROLES, ACCOUNTANT_ROLES, VIEW_ROLES, CREATE_ROLES, deriveCashFields } from '@/lib/financeJournal';
