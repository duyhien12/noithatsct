import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VIEW_ROLES, SETTINGS_ROLES } from '@/lib/financeJournal';

const schema = z.object({
    name: z.string().trim().min(1, 'Tên phân loại bắt buộc'),
    group: z.enum(['Thu', 'Chi']),
    order: z.number().optional().default(0),
    active: z.boolean().optional().default(true),
}).strict();

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');
    const where = group ? { group } : {};
    const data = await prisma.financeCategory.findMany({ where, orderBy: [{ group: 'asc' }, { order: 'asc' }] });
    return NextResponse.json(data);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request) => {
    const data = schema.parse(await request.json());
    const created = await prisma.financeCategory.create({ data });
    return NextResponse.json(created, { status: 201 });
}, { roles: SETTINGS_ROLES });
