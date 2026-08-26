import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const GET = withAuth(async () => {
    const units = await prisma.invUnit.findMany({ orderBy: { code: 'asc' } });
    return NextResponse.json({ data: units });
});

export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'manage_settings');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const code = (body.code || '').trim();
    const name = (body.name || '').trim();
    if (!code || !name) return NextResponse.json({ error: 'Thiếu mã hoặc tên đơn vị' }, { status: 400 });

    const unit = await prisma.invUnit.create({ data: { code, name } });
    return NextResponse.json(unit, { status: 201 });
});
