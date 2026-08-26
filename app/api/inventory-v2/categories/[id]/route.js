import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const PUT = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const category = await prisma.invMaterialCategory.update({
        where: { id },
        data: {
            name: body.name?.trim(), order: body.order, active: body.active,
            parentId: body.parentId === undefined ? undefined : (body.parentId || null),
        },
    });
    return NextResponse.json(category);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const [materialCount, childCount] = await Promise.all([
        prisma.invMaterial.count({ where: { categoryId: id } }),
        prisma.invMaterialCategory.count({ where: { parentId: id } }),
    ]);
    if (materialCount > 0 || childCount > 0) {
        return NextResponse.json({ error: 'Nhóm đang có vật tư hoặc nhóm con — không thể xóa' }, { status: 409 });
    }
    await prisma.invMaterialCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
