import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VIEW_ROLES, SETTINGS_ROLES, BALANCE_STATUS } from '@/lib/financeJournal';

const schema = z.object({
    name: z.string().trim().min(1, 'Tên quỹ bắt buộc'),
    status: z.boolean().optional().default(true),
    openingBalance: z.number().optional().default(0),
    notes: z.string().trim().optional().default(''),
    accountingAccountId: z.string().optional().nullable().default(null),
}).strict();

export const GET = withAuth(async () => {
    const funds = await prisma.cashFund.findMany({
        orderBy: { createdAt: 'asc' },
        include: { accountingAccount: { select: { id: true, code: true, name: true } } },
    });
    const sums = await prisma.financeTransaction.groupBy({
        by: ['cashFundId'],
        where: { status: BALANCE_STATUS, deletedAt: null, cashFundId: { not: null } },
        _sum: { cashIn: true, cashOut: true },
    });
    const sumMap = new Map(sums.map(s => [s.cashFundId, s]));
    const data = funds.map(f => {
        const s = sumMap.get(f.id);
        const balance = f.openingBalance + (s?._sum.cashIn || 0) - (s?._sum.cashOut || 0);
        return { ...f, balance };
    });
    return NextResponse.json(data);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request) => {
    const data = schema.parse(await request.json());
    const created = await prisma.cashFund.create({ data });
    return NextResponse.json(created, { status: 201 });
}, { roles: SETTINGS_ROLES });
