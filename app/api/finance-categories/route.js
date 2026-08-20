import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VIEW_ROLES, SETTINGS_ROLES } from '@/lib/financeJournal';

const MAX_LEVEL = 3;

const schema = z.object({
    name: z.string().trim().min(1, 'Tên phân loại bắt buộc'),
    group: z.enum(['Thu', 'Chi']),
    parentId: z.string().optional().nullable().default(null),
    order: z.number().optional().default(0),
    active: z.boolean().optional().default(true),
}).strict();

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');
    const where = group ? { group } : {};
    const data = await prisma.financeCategory.findMany({ where, orderBy: [{ group: 'asc' }, { level: 'asc' }, { order: 'asc' }] });
    return NextResponse.json(data);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request) => {
    const data = schema.parse(await request.json());
    let level = 1;
    if (data.parentId) {
        const parent = await prisma.financeCategory.findUnique({ where: { id: data.parentId } });
        if (!parent) return NextResponse.json({ error: 'Danh mục cha không tồn tại' }, { status: 400 });
        if (parent.group !== data.group) return NextResponse.json({ error: 'Danh mục cha phải cùng nhóm Thu/Chi' }, { status: 400 });
        if (parent.level >= MAX_LEVEL) return NextResponse.json({ error: `Đã đạt cấp tối đa (cấp ${MAX_LEVEL})` }, { status: 400 });
        level = parent.level + 1;
    }
    const created = await prisma.financeCategory.create({ data: { ...data, level } });
    return NextResponse.json(created, { status: 201 });
}, { roles: SETTINGS_ROLES });
