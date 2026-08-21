import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { CREATE_ROLES, getFinancePermissions } from '@/lib/financeJournal';

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    if (!getFinancePermissions(session.user).canRestore) {
        return NextResponse.json({ error: 'Bạn không có quyền khôi phục giao dịch' }, { status: 403 });
    }

    const existing = await prisma.financeTransaction.findFirst({ where: { id, deletedAt: { not: null } } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy giao dịch đã xóa' }, { status: 404 });

    const restored = await prisma.financeTransaction.update({ where: { id }, data: { deletedAt: null } });

    await prisma.financeTransactionAudit.create({
        data: {
            transactionId: id,
            action: 'restore',
            actorName: session.user.name,
            actorId: session.user.id,
            actorRole: session.user.role,
            beforeData: existing,
            afterData: restored,
        },
    });

    return NextResponse.json(restored);
}, { roles: CREATE_ROLES });
