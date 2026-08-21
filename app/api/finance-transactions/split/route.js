import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withCodeRetry } from '@/lib/generateCode';
import { financeTransactionSplitSchema } from '@/lib/validations/financeTransaction';
import { CREATE_ROLES, deriveCashFields } from '@/lib/financeJournal';
import { randomUUID } from 'crypto';

const INCLUDE = {
    project: { select: { id: true, name: true, code: true } },
    category: { select: { id: true, name: true, group: true } },
    debitAccount: { select: { id: true, code: true, name: true } },
    creditAccount: { select: { id: true, code: true, name: true } },
    bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
};

// Tách 1 lần nhập chung thành nhiều giao dịch — mỗi công trình 1 phiếu riêng,
// cùng nội dung/hạch toán gốc, được nhóm lại bằng splitGroupId.
export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = financeTransactionSplitSchema.parse(body);
    const { allocations, ...common } = data;

    const itemAmount = (common.itemQty || 0) * (common.itemUnitPrice || 0);
    const cleanCommon = Object.fromEntries(Object.entries(common).filter(([, v]) => v !== null));
    const splitGroupId = randomUUID();
    const prefix = common.type === 'Thu' ? 'PT' : 'PC';

    const created = [];
    for (const alloc of allocations) {
        const cash = deriveCashFields(common.type, common.method, alloc.amount);
        const row = await withCodeRetry('financeTransaction', prefix, (code) =>
            prisma.financeTransaction.create({
                data: {
                    code,
                    ...cleanCommon,
                    ...cash,
                    amount: alloc.amount,
                    projectId: alloc.projectId,
                    itemAmount,
                    splitGroupId,
                    createdBy: session.user.name,
                    createdById: session.user.id,
                    createdByRole: session.user.role,
                },
                include: INCLUDE,
            }), 5
        );
        created.push(row);
        await prisma.financeTransactionAudit.create({
            data: {
                transactionId: row.id,
                action: 'create',
                actorName: session.user.name,
                actorId: session.user.id,
                actorRole: session.user.role,
                reason: `Tách từ 1 lần nhập chung cho ${allocations.length} công trình`,
                afterData: row,
            },
        });
    }

    return NextResponse.json({ transactions: created }, { status: 201 });
}, { roles: CREATE_ROLES });
