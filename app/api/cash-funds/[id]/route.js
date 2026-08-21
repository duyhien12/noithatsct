import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SETTINGS_ROLES } from '@/lib/financeJournal';

const schema = z.object({
    name: z.string().trim().min(1, 'Tên quỹ bắt buộc'),
    status: z.boolean().optional().default(true),
    openingBalance: z.number().optional().default(0),
    notes: z.string().trim().optional().default(''),
    accountingAccountId: z.string().optional().nullable().default(null),
}).strict();

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = schema.parse(await request.json());
    const updated = await prisma.cashFund.update({ where: { id }, data });
    return NextResponse.json(updated);
}, { roles: SETTINGS_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const inUse = await prisma.financeTransaction.count({ where: { cashFundId: id, deletedAt: null } });
    if (inUse > 0) {
        const updated = await prisma.cashFund.update({ where: { id }, data: { status: false } });
        return NextResponse.json({ ...updated, deactivatedInstead: true });
    }
    await prisma.cashFund.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: SETTINGS_ROLES });
