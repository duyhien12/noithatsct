import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const VIEW_ROLES = ['kinh_doanh', 'thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin', 'viewer'];
const MANAGE_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const GET = withAuth(async () => {
    const items = await prisma.designPriceListItem.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(items);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request) => {
    const body = await request.json();
    if (!body.name || !String(body.name).trim()) {
        return NextResponse.json({ error: 'Tên hạng mục bắt buộc' }, { status: 400 });
    }

    const maxOrder = await prisma.designPriceListItem.aggregate({ _max: { order: true } });
    const item = await prisma.designPriceListItem.create({
        data: {
            name: body.name.trim(),
            unit: body.unit || '',
            defaultUnitPrice: Number(body.defaultUnitPrice) || 0,
            order: (maxOrder._max.order ?? -1) + 1,
            active: body.active ?? true,
        },
    });
    return NextResponse.json(item, { status: 201 });
}, { roles: MANAGE_ROLES });
