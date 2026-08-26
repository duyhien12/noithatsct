import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const GET = withAuth(async () => {
    const categories = await prisma.invMaterialCategory.findMany({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { materials: true, children: true } } },
    });
    return NextResponse.json({ data: categories });
});

export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const code = (body.code || '').trim().toUpperCase();
    const skuPrefix = (body.skuPrefix || code).trim().toUpperCase();
    const name = (body.name || '').trim();
    if (!code || !name || !skuPrefix) return NextResponse.json({ error: 'Thiếu mã, prefix SKU hoặc tên nhóm' }, { status: 400 });

    const category = await prisma.invMaterialCategory.create({
        data: { code, name, skuPrefix, parentId: body.parentId || null, order: body.order || 0 },
    });
    return NextResponse.json(category, { status: 201 });
});
