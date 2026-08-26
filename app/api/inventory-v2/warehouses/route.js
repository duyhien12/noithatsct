import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';
import { withCodeRetry } from '@/lib/generateCode';

export const GET = withAuth(async () => {
    const warehouses = await prisma.invWarehouse.findMany({
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { locations: true, materials: true } } },
    });
    return NextResponse.json({ data: warehouses });
});

export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const name = (body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Thiếu tên kho' }, { status: 400 });

    const warehouse = body.code
        ? await prisma.invWarehouse.create({ data: { code: body.code.trim(), name, address: body.address || '', type: body.type || 'Kho chính' } })
        : await withCodeRetry('invWarehouse', 'KHO', (code) => prisma.invWarehouse.create({ data: { code, name, address: body.address || '', type: body.type || 'Kho chính' } }));

    return NextResponse.json(warehouse, { status: 201 });
});
