import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { financeTransactionUpdateSchema } from '@/lib/validations/financeTransaction';
import { VIEW_ROLES, CREATE_ROLES, deriveCashFields, canEditTransaction, canDeleteTransaction } from '@/lib/financeJournal';

const INCLUDE = {
    project: { select: { id: true, name: true, code: true } },
    category: { select: { id: true, name: true, group: true } },
    debitAccount: { select: { id: true, code: true, name: true } },
    creditAccount: { select: { id: true, code: true, name: true } },
    bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
    audits: { orderBy: { createdAt: 'desc' } },
};

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const tx = await prisma.financeTransaction.findFirst({ where: { id, deletedAt: null }, include: INCLUDE });
    if (!tx) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 });
    return NextResponse.json(tx);
}, { roles: VIEW_ROLES });

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.financeTransaction.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 });

    if (!canEditTransaction(session.user, existing)) {
        return NextResponse.json({ error: 'Giao dịch đã hạch toán, bạn không có quyền sửa' }, { status: 403 });
    }

    const body = await request.json();
    const data = financeTransactionUpdateSchema.parse(body);
    const cash = deriveCashFields(data.type, data.method, data.amount);
    const itemAmount = (data.itemQty || 0) * (data.itemUnitPrice || 0);
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null));

    const updated = await prisma.financeTransaction.update({
        where: { id },
        data: { ...cleanData, ...cash, itemAmount },
        include: INCLUDE,
    });

    await prisma.financeTransactionAudit.create({
        data: {
            transactionId: id,
            action: 'update',
            actorName: session.user.name,
            actorId: session.user.id,
            actorRole: session.user.role,
            beforeData: existing,
            afterData: updated,
        },
    });

    return NextResponse.json(updated);
}, { roles: CREATE_ROLES });

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.financeTransaction.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 });

    if (!canDeleteTransaction(session.user, existing)) {
        return NextResponse.json({ error: 'Giao dịch đã duyệt/hạch toán — vui lòng Hủy giao dịch trước khi xóa' }, { status: 400 });
    }

    await prisma.financeTransaction.update({ where: { id }, data: { deletedAt: new Date() } });
    await prisma.financeTransactionAudit.create({
        data: {
            transactionId: id,
            action: 'delete',
            actorName: session.user.name,
            actorId: session.user.id,
            actorRole: session.user.role,
            beforeData: existing,
        },
    });

    return NextResponse.json({ success: true });
}, { roles: CREATE_ROLES });
