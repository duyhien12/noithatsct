import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';
import { withCodeRetry } from '@/lib/generateCode';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const status = searchParams.get('status') || undefined;

    const data = await prisma.invStocktake.findMany({
        where: { ...(warehouseId ? { warehouseId } : {}), ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        include: { warehouse: { select: { id: true, name: true } }, _count: { select: { lines: true } } },
    });
    return NextResponse.json({ data });
});

export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'stocktake');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    if (!body.warehouseId) return NextResponse.json({ error: 'Thiếu kho kiểm kê' }, { status: 400 });

    const stocktake = await withCodeRetry('invStocktake', 'KK', (code) => prisma.invStocktake.create({
        data: { code, warehouseId: body.warehouseId, scopeCategoryId: body.scopeCategoryId || null, note: body.note || '', startedById: session.user.id },
    }));
    return NextResponse.json(stocktake, { status: 201 });
});
