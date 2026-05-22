import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { roomId } = await params;
    const { name, sortOrder } = await req.json();
    const room = await prisma.productionRoom.update({
        where: { id: roomId },
        data: { ...(name && { name }), ...(sortOrder !== undefined && { sortOrder }) }
    });
    return NextResponse.json(room);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { roomId } = await params;
    await prisma.productionRoom.delete({ where: { id: roomId } });
    return NextResponse.json({ ok: true });
});
