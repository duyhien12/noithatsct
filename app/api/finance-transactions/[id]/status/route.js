import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { financeTransactionStatusSchema } from '@/lib/validations/financeTransaction';
import { CREATE_ROLES, canTransitionStatus } from '@/lib/financeJournal';

export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.financeTransaction.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 });

    const { status, cancelReason } = financeTransactionStatusSchema.parse(await request.json());

    if (!canTransitionStatus(session.user, existing.status, status)) {
        return NextResponse.json({ error: 'Bạn không có quyền chuyển trạng thái này' }, { status: 403 });
    }
    if (status === 'Đã hạch toán' && !(existing.amount > 0)) {
        return NextResponse.json({ error: 'Không thể hạch toán giao dịch có số tiền bằng 0' }, { status: 400 });
    }

    const data = { status };
    if (status === 'Hủy') {
        data.cancelReason = cancelReason?.trim() || '';
        data.canceledBy = session.user.name;
        data.canceledAt = new Date();
    }

    const updated = await prisma.financeTransaction.update({ where: { id }, data });

    await prisma.financeTransactionAudit.create({
        data: {
            transactionId: id,
            action: status === 'Hủy' ? 'cancel' : 'update',
            actorName: session.user.name,
            actorId: session.user.id,
            actorRole: session.user.role,
            reason: status === 'Hủy' ? (cancelReason?.trim() || '') : '',
            beforeData: { status: existing.status },
            afterData: { status },
        },
    });

    return NextResponse.json(updated);
}, { roles: CREATE_ROLES });
