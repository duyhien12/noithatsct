import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SETTINGS_ROLES } from '@/lib/financeJournal';

const schema = z.object({
    name: z.string().trim().min(1, 'Tên phân loại bắt buộc'),
    group: z.enum(['Thu', 'Chi']),
    order: z.number().optional().default(0),
    active: z.boolean().optional().default(true),
}).strict();

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = schema.parse(await request.json());
    const updated = await prisma.financeCategory.update({ where: { id }, data });
    return NextResponse.json(updated);
}, { roles: SETTINGS_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const inUse = await prisma.financeTransaction.count({ where: { categoryId: id, deletedAt: null } });
    if (inUse > 0) {
        // Không xóa danh mục đang được dùng — chỉ vô hiệu hóa để không phá dữ liệu cũ
        const updated = await prisma.financeCategory.update({ where: { id }, data: { active: false } });
        return NextResponse.json({ ...updated, deactivatedInstead: true });
    }
    await prisma.financeCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: SETTINGS_ROLES });
