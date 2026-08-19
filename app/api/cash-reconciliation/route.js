import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VIEW_ROLES, CREATE_ROLES, BALANCE_STATUS } from '@/lib/financeJournal';

const schema = z.object({
    targetType: z.enum(['cash', 'bank']),
    bankAccountId: z.string().optional().nullable().default(null),
    actualBalance: z.number(),
    note: z.string().trim().optional().default(''),
}).strict();

async function computeSystemBalance(targetType, bankAccountId) {
    if (targetType === 'cash') {
        const agg = await prisma.financeTransaction.aggregate({
            where: { status: BALANCE_STATUS, deletedAt: null },
            _sum: { cashIn: true, cashOut: true },
        });
        return (agg._sum.cashIn || 0) - (agg._sum.cashOut || 0);
    }
    const bank = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bank) throw new Error('Không tìm thấy tài khoản ngân hàng');
    const agg = await prisma.financeTransaction.aggregate({
        where: { status: BALANCE_STATUS, deletedAt: null, bankAccountId },
        _sum: { bankIn: true, bankOut: true },
    });
    return bank.openingBalance + (agg._sum.bankIn || 0) - (agg._sum.bankOut || 0);
}

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType');
    const bankAccountId = searchParams.get('bankAccountId');
    const where = {};
    if (targetType) where.targetType = targetType;
    if (bankAccountId) where.bankAccountId = bankAccountId;
    const data = await prisma.cashReconciliation.findMany({
        where,
        include: { bankAccount: { select: { bankName: true, accountNumber: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return NextResponse.json(data);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request, _ctx, session) => {
    const { targetType, bankAccountId, actualBalance, note } = schema.parse(await request.json());
    if (targetType === 'bank' && !bankAccountId) {
        return NextResponse.json({ error: 'Vui lòng chọn tài khoản ngân hàng cần đối chiếu' }, { status: 400 });
    }

    const systemBalance = await computeSystemBalance(targetType, bankAccountId);
    const created = await prisma.cashReconciliation.create({
        data: {
            targetType,
            bankAccountId: targetType === 'bank' ? bankAccountId : null,
            systemBalance,
            actualBalance,
            difference: actualBalance - systemBalance,
            note,
            reconciledBy: session.user.name,
        },
    });
    return NextResponse.json(created, { status: 201 });
}, { roles: CREATE_ROLES });
