import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const MANAGE_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.designPriceListItem.update({
        where: { id },
        data: {
            name: body.name !== undefined ? String(body.name).trim() : undefined,
            unit: body.unit !== undefined ? body.unit : undefined,
            defaultUnitPrice: body.defaultUnitPrice !== undefined ? Number(body.defaultUnitPrice) || 0 : undefined,
            order: body.order !== undefined ? Number(body.order) : undefined,
            active: body.active !== undefined ? Boolean(body.active) : undefined,
        },
    });
    return NextResponse.json(item);
}, { roles: MANAGE_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.designPriceListItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: MANAGE_ROLES });
