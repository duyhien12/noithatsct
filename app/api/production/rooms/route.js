import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (req) => {
    const { floorId, name, sortOrder } = await req.json();
    if (!floorId || !name) return NextResponse.json({ error: 'floorId and name required' }, { status: 400 });

    const room = await prisma.productionRoom.create({
        data: { floorId, name, sortOrder: sortOrder ?? 0 },
        include: { items: true }
    });
    return NextResponse.json(room, { status: 201 });
});
