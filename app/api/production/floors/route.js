import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (req) => {
    const { orderId, name, sortOrder } = await req.json();
    if (!orderId || !name) return NextResponse.json({ error: 'orderId and name required' }, { status: 400 });

    const floor = await prisma.productionFloor.create({
        data: { orderId, name, sortOrder: sortOrder ?? 0 },
        include: { rooms: { include: { items: true } } }
    });
    return NextResponse.json(floor, { status: 201 });
});
