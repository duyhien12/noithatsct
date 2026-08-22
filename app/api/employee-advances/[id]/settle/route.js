import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { advanceSettlementCreateSchema } from '@/lib/validations/employeeAdvance';
import { CREATE_ROLES, deriveCashFields } from '@/lib/financeJournal';
import { SETTLE_TYPE_LABELS } from '@/lib/employeeAdvance';

const SETTLE_CODE_PREFIX = { cash_return: 'HU', expense_proof: 'QT', salary_deduction: 'KT' };

// Xử lý số dư tạm ứng — 3 nhánh nghiệp vụ tách biệt (Mục VI):
//  - cash_return: nhân viên trả lại tiền → TẠO dòng Thu trong Nhật ký (tiền thật vào quỹ/TK).
//  - expense_proof: quyết toán bằng hóa đơn/chứng từ chi phí → CHỈ giảm số dư, KHÔNG tạo dòng tiền.
//  - salary_deduction: khấu trừ lương → CHỈ giảm số dư, KHÔNG tạo dòng tiền (trừ khi thực có
//    chuyển khoản lương tách riêng, ngoài phạm vi module này).
export const POST = withAuth(async (request, { params }, session) => {
    const { id: advanceId } = await params;
    const body = await request.json();
    const data = advanceSettlementCreateSchema.parse(body);

    const advance = await prisma.employeeAdvance.findUnique({
        where: { id: advanceId },
        include: { employee: { select: { id: true, name: true } }, settlements: true },
    });
    if (!advance) return NextResponse.json({ error: 'Không tìm thấy khoản tạm ứng' }, { status: 404 });

    const alreadySettled = advance.settlements.reduce((s, x) => s + x.amount, 0);
    const remaining = advance.amount - alreadySettled;
    if (data.amount > remaining + 0.01) {
        return NextResponse.json({ error: `Số tiền quyết toán (${data.amount.toLocaleString('vi-VN')}) vượt quá số dư còn lại của khoản tạm ứng này (${remaining.toLocaleString('vi-VN')})` }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
        let financeTx = null;

        if (data.settleType === 'cash_return') {
            const cash = deriveCashFields('Thu', data.method, data.amount);
            financeTx = await withCodeRetry('financeTransaction', 'PT', (code) =>
                tx.financeTransaction.create({
                    data: {
                        code,
                        date: data.date,
                        type: 'Thu',
                        method: data.method,
                        amount: data.amount,
                        ...cash,
                        department: 'Hành chính kế toán',
                        content: `Hoàn ứng — ${advance.employee.name}`,
                        detail: `Hoàn ứng khoản tạm ứng ${advance.code}`,
                        debitAccountId: data.debitAccountId,
                        creditAccountId: data.creditAccountId,
                        bankAccountId: data.method === 'Chuyển khoản' ? data.bankAccountId : null,
                        cashFundId: data.method === 'Tiền mặt' ? data.cashFundId : null,
                        objectType: 'Nhân viên',
                        objectId: advance.employeeId,
                        objectName: advance.employee.name,
                        notes: data.notes,
                        status: 'Đã hạch toán',
                        createdBy: session.user.name,
                        createdById: session.user.id,
                        createdByRole: session.user.role,
                    },
                }), 5
            );
            await tx.financeTransactionAudit.create({
                data: {
                    transactionId: financeTx.id, action: 'create',
                    actorName: session.user.name, actorId: session.user.id, actorRole: session.user.role,
                    reason: `Hoàn ứng khoản tạm ứng ${advance.code}`, afterData: financeTx,
                },
            });
        }

        const settlement = await withCodeRetry('advanceSettlement', SETTLE_CODE_PREFIX[data.settleType], (code) =>
            tx.advanceSettlement.create({
                data: {
                    code,
                    advanceId,
                    settleType: data.settleType,
                    amount: data.amount,
                    date: data.date,
                    proofUrl: data.proofUrl,
                    notes: data.notes,
                    createdBy: session.user.name,
                    financeTransactionId: financeTx?.id || null,
                },
                include: { financeTransaction: true },
            }), 5
        );

        return settlement;
    });

    return NextResponse.json({ ...result, settleTypeLabel: SETTLE_TYPE_LABELS[result.settleType] }, { status: 201 });
}, { roles: CREATE_ROLES });
