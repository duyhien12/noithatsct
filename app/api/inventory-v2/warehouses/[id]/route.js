import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const PUT = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const warehouse = await prisma.invWarehouse.update({
        where: { id },
        data: { name: body.name?.trim(), address: body.address, type: body.type, active: body.active, notes: body.notes },
    });
    return NextResponse.json(warehouse);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const balanceCount = await prisma.invStockBalance.count({ where: { warehouseId: id, onHandQty: { not: 0 } } });
    if (balanceCount > 0) {
        return NextResponse.json({ error: 'Kho còn tồn vật tư — không thể xóa' }, { status: 409 });
    }
    await prisma.invWarehouse.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
