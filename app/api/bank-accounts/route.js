import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VIEW_ROLES, SETTINGS_ROLES, BALANCE_STATUS } from '@/lib/financeJournal';

const schema = z.object({
    bankName: z.string().trim().min(1, 'Tên ngân hàng bắt buộc'),
    accountNumber: z.string().trim().optional().default(''),
    accountHolder: z.string().trim().optional().default(''),
    branch: z.string().trim().optional().default(''),
    status: z.boolean().optional().default(true),
    openingBalance: z.number().optional().default(0),
    notes: z.string().trim().optional().default(''),
}).strict();

export const GET = withAuth(async () => {
    const accounts = await prisma.bankAccount.findMany({ orderBy: { createdAt: 'asc' } });
    const sums = await prisma.financeTransaction.groupBy({
        by: ['bankAccountId'],
        where: { status: BALANCE_STATUS, deletedAt: null, bankAccountId: { not: null } },
        _sum: { bankIn: true, bankOut: true },
    });
    const sumMap = new Map(sums.map(s => [s.bankAccountId, s]));
    const data = accounts.map(a => {
        const s = sumMap.get(a.id);
        const balance = a.openingBalance + (s?._sum.bankIn || 0) - (s?._sum.bankOut || 0);
        return { ...a, balance };
    });
    return NextResponse.json(data);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request) => {
    const data = schema.parse(await request.json());
    const created = await prisma.bankAccount.create({ data });
    return NextResponse.json(created, { status: 201 });
}, { roles: SETTINGS_ROLES });
