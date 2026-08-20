import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SETTINGS_ROLES } from '@/lib/financeJournal';

const MAX_LEVEL = 3;

const schema = z.object({
    name: z.string().trim().min(1, 'Tên phân loại bắt buộc'),
    group: z.enum(['Thu', 'Chi']),
    parentId: z.string().optional().nullable().default(null),
    order: z.number().optional().default(0),
    active: z.boolean().optional().default(true),
}).strict();

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = schema.parse(await request.json());

    let level = 1;
    if (data.parentId) {
        if (data.parentId === id) return NextResponse.json({ error: 'Danh mục không thể là cha của chính nó' }, { status: 400 });
        const parent = await prisma.financeCategory.findUnique({ where: { id: data.parentId } });
        if (!parent) return NextResponse.json({ error: 'Danh mục cha không tồn tại' }, { status: 400 });
        if (parent.group !== data.group) return NextResponse.json({ error: 'Danh mục cha phải cùng nhóm Thu/Chi' }, { status: 400 });
        if (parent.level >= MAX_LEVEL) return NextResponse.json({ error: `Đã đạt cấp tối đa (cấp ${MAX_LEVEL})` }, { status: 400 });
        // Chặn gán cha là hậu duệ của chính nó (tránh vòng lặp)
        let cur = parent;
        while (cur) {
            if (cur.id === id) return NextResponse.json({ error: 'Không thể chọn hậu duệ của chính nó làm danh mục cha' }, { status: 400 });
            cur = cur.parentId ? await prisma.financeCategory.findUnique({ where: { id: cur.parentId } }) : null;
        }
        level = parent.level + 1;
    }

    const hasChildren = await prisma.financeCategory.count({ where: { parentId: id } });
    if (hasChildren > 0 && level !== 1) {
        return NextResponse.json({ error: 'Danh mục đang có danh mục con — không thể chuyển thành cấp con của danh mục khác' }, { status: 400 });
    }

    const updated = await prisma.financeCategory.update({ where: { id }, data: { ...data, level } });
    return NextResponse.json(updated);
}, { roles: SETTINGS_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const childCount = await prisma.financeCategory.count({ where: { parentId: id } });
    if (childCount > 0) {
        return NextResponse.json({ error: 'Danh mục đang có danh mục con — hãy xóa/chuyển các danh mục con trước' }, { status: 400 });
    }
    const inUse = await prisma.financeTransaction.count({ where: { categoryId: id, deletedAt: null } });
    if (inUse > 0) {
        // Không xóa danh mục đang được dùng — chỉ vô hiệu hóa để không phá dữ liệu cũ
        const updated = await prisma.financeCategory.update({ where: { id }, data: { active: false } });
        return NextResponse.json({ ...updated, deactivatedInstead: true });
    }
    await prisma.financeCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: SETTINGS_ROLES });
