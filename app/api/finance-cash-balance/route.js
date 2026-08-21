import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VIEW_ROLES, SETTINGS_ROLES, BALANCE_STATUS } from '@/lib/financeJournal';

const CASH_OPENING_BALANCE_KEY = 'finance_cash_opening_balance';

export const GET = withAuth(async () => {
    const [setting, agg] = await Promise.all([
        prisma.setting.findUnique({ where: { key: CASH_OPENING_BALANCE_KEY } }),
        prisma.financeTransaction.aggregate({
            where: { status: BALANCE_STATUS, deletedAt: null },
            _sum: { cashIn: true, cashOut: true },
        }),
    ]);
    const openingBalance = setting ? Number(setting.value) || 0 : 0;
    const balance = openingBalance + (agg._sum.cashIn || 0) - (agg._sum.cashOut || 0);
    return NextResponse.json({ openingBalance, balance });
}, { roles: VIEW_ROLES });

const schema = z.object({ openingBalance: z.number() }).strict();

export const PUT = withAuth(async (request) => {
    const { openingBalance } = schema.parse(await request.json());
    await prisma.setting.upsert({
        where: { key: CASH_OPENING_BALANCE_KEY },
        create: { key: CASH_OPENING_BALANCE_KEY, value: String(openingBalance) },
        update: { value: String(openingBalance) },
    });
    return NextResponse.json({ openingBalance });
}, { roles: SETTINGS_ROLES });
