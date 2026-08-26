import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const PUT = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const location = await prisma.invLocation.update({
        where: { id },
        data: { name: body.name?.trim(), level: body.level, active: body.active },
    });
    return NextResponse.json(location);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const childCount = await prisma.invLocation.count({ where: { parentId: id } });
    if (childCount > 0) return NextResponse.json({ error: 'Vị trí còn vị trí con — không thể xóa' }, { status: 409 });
    await prisma.invLocation.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
