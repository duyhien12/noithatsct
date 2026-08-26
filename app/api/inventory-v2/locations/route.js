import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const locations = await prisma.invLocation.findMany({
        where: warehouseId ? { warehouseId } : undefined,
        orderBy: { code: 'asc' },
    });
    return NextResponse.json({ data: locations });
});

export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const { warehouseId, code, name } = body;
    if (!warehouseId || !code || !name) return NextResponse.json({ error: 'Thiếu kho, mã hoặc tên vị trí' }, { status: 400 });

    const location = await prisma.invLocation.create({
        data: { warehouseId, code: code.trim(), name: name.trim(), level: body.level || 'SHELF', parentId: body.parentId || null },
    });
    return NextResponse.json(location, { status: 201 });
});
