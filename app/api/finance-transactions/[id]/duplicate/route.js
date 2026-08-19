import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withCodeRetry } from '@/lib/generateCode';
import { CREATE_ROLES } from '@/lib/financeJournal';

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const src = await prisma.financeTransaction.findFirst({ where: { id, deletedAt: null } });
    if (!src) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 });

    const prefix = src.type === 'Thu' ? 'PT' : 'PC';
    const created = await withCodeRetry('financeTransaction', prefix, (code) =>
        prisma.financeTransaction.create({
            data: {
                code,
                date: new Date(),
                type: src.type,
                method: src.method,
                amount: src.amount,
                cashIn: src.cashIn, cashOut: src.cashOut, bankIn: src.bankIn, bankOut: src.bankOut,
                department: src.department,
                projectId: src.projectId,
                content: src.content,
                detail: src.detail,
                debitAccountId: src.debitAccountId,
                creditAccountId: src.creditAccountId,
                bankAccountId: src.bankAccountId,
                categoryId: src.categoryId,
                objectType: src.objectType,
                objectId: src.objectId,
                objectName: src.objectName,
                payerReceiver: src.payerReceiver,
                itemName: src.itemName,
                itemUnit: src.itemUnit,
                itemQty: src.itemQty,
                itemUnitPrice: src.itemUnitPrice,
                itemAmount: src.itemAmount,
                notes: src.notes,
                status: 'Nháp',
                createdBy: session.user.name,
                createdById: session.user.id,
                createdByRole: session.user.role,
            },
        }), 5
    );

    await prisma.financeTransactionAudit.create({
        data: {
            transactionId: created.id,
            action: 'create',
            actorName: session.user.name,
            actorId: session.user.id,
            actorRole: session.user.role,
            reason: `Nhân bản từ ${src.code}`,
            afterData: created,
        },
    });

    return NextResponse.json(created, { status: 201 });
}, { roles: CREATE_ROLES });
