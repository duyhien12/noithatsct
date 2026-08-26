import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const PUT = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const unit = await prisma.invUnit.update({
        where: { id },
        data: { code: body.code?.trim(), name: body.name?.trim(), active: body.active },
    });
    return NextResponse.json(unit);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const inUse = await prisma.invMaterial.count({
        where: { OR: [{ purchaseUnitId: id }, { stockUnitId: id }, { issueUnitId: id }] },
    });
    if (inUse > 0) {
        return NextResponse.json({ error: 'Đơn vị đang được dùng bởi vật tư — không thể xóa' }, { status: 409 });
    }
    await prisma.invUnit.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
