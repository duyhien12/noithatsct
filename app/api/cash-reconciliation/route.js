import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VIEW_ROLES, CREATE_ROLES, BALANCE_STATUS } from '@/lib/financeJournal';

const CASH_OPENING_BALANCE_KEY = 'finance_cash_opening_balance';

const schema = z.object({
    targetType: z.enum(['cash', 'bank']),
    bankAccountId: z.string().optional().nullable().default(null),
    cashFundId: z.string().optional().nullable().default(null),
    actualBalance: z.number(),
    note: z.string().trim().optional().default(''),
}).strict();

async function computeSystemBalance(targetType, bankAccountId, cashFundId) {
    if (targetType === 'cash') {
        if (cashFundId) {
            const fund = await prisma.cashFund.findUnique({ where: { id: cashFundId } });
            if (!fund) throw new Error('Không tìm thấy quỹ tiền mặt');
            const agg = await prisma.financeTransaction.aggregate({
                where: { status: BALANCE_STATUS, deletedAt: null, cashFundId },
                _sum: { cashIn: true, cashOut: true },
            });
            return fund.openingBalance + (agg._sum.cashIn || 0) - (agg._sum.cashOut || 0);
        }
        const [setting, agg] = await Promise.all([
            prisma.setting.findUnique({ where: { key: CASH_OPENING_BALANCE_KEY } }),
            prisma.financeTransaction.aggregate({
                where: { status: BALANCE_STATUS, deletedAt: null },
                _sum: { cashIn: true, cashOut: true },
            }),
        ]);
        const openingBalance = setting ? Number(setting.value) || 0 : 0;
        return openingBalance + (agg._sum.cashIn || 0) - (agg._sum.cashOut || 0);
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
    const cashFundId = searchParams.get('cashFundId');
    const where = {};
    if (targetType) where.targetType = targetType;
    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (cashFundId) where.cashFundId = cashFundId;
    const data = await prisma.cashReconciliation.findMany({
        where,
        include: {
            bankAccount: { select: { bankName: true, accountNumber: true } },
            cashFund: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return NextResponse.json(data);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request, _ctx, session) => {
    const { targetType, bankAccountId, cashFundId, actualBalance, note } = schema.parse(await request.json());
    if (targetType === 'bank' && !bankAccountId) {
        return NextResponse.json({ error: 'Vui lòng chọn tài khoản ngân hàng cần đối chiếu' }, { status: 400 });
    }

    const systemBalance = await computeSystemBalance(targetType, bankAccountId, cashFundId);
    const created = await prisma.cashReconciliation.create({
        data: {
            targetType,
            bankAccountId: targetType === 'bank' ? bankAccountId : null,
            cashFundId: targetType === 'cash' ? cashFundId : null,
            systemBalance,
            actualBalance,
            difference: actualBalance - systemBalance,
            note,
            reconciledBy: session.user.name,
        },
    });
    return NextResponse.json(created, { status: 201 });
}, { roles: CREATE_ROLES });
