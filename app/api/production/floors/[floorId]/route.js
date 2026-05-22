import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { floorId } = await params;
    const { name, sortOrder } = await req.json();
    const floor = await prisma.productionFloor.update({
        where: { id: floorId },
        data: { ...(name && { name }), ...(sortOrder !== undefined && { sortOrder }) }
    });
    return NextResponse.json(floor);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { floorId } = await params;
    await prisma.productionFloor.delete({ where: { id: floorId } });
    return NextResponse.json({ ok: true });
});
