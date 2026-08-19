import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SETTINGS_ROLES } from '@/lib/financeJournal';

const schema = z.object({
    code: z.string().trim().min(1, 'Mã TK bắt buộc'),
    name: z.string().trim().min(1, 'Tên TK bắt buộc'),
    order: z.number().optional().default(0),
    active: z.boolean().optional().default(true),
}).strict();

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = schema.parse(await request.json());
    const updated = await prisma.accountingAccount.update({ where: { id }, data });
    return NextResponse.json(updated);
}, { roles: SETTINGS_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const inUse = await prisma.financeTransaction.count({
        where: { deletedAt: null, OR: [{ debitAccountId: id }, { creditAccountId: id }] },
    });
    if (inUse > 0) {
        const updated = await prisma.accountingAccount.update({ where: { id }, data: { active: false } });
        return NextResponse.json({ ...updated, deactivatedInstead: true });
    }
    await prisma.accountingAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: SETTINGS_ROLES });
