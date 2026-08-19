import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VIEW_ROLES, SETTINGS_ROLES } from '@/lib/financeJournal';

const schema = z.object({
    code: z.string().trim().min(1, 'Mã TK bắt buộc'),
    name: z.string().trim().min(1, 'Tên TK bắt buộc'),
    order: z.number().optional().default(0),
    active: z.boolean().optional().default(true),
}).strict();

export const GET = withAuth(async () => {
    const data = await prisma.accountingAccount.findMany({ orderBy: [{ order: 'asc' }, { code: 'asc' }] });
    return NextResponse.json(data);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request) => {
    const data = schema.parse(await request.json());
    const created = await prisma.accountingAccount.create({ data });
    return NextResponse.json(created, { status: 201 });
}, { roles: SETTINGS_ROLES });
