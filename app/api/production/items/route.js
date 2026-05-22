import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (req) => {
    const { roomId, name, quantity, notes, sortOrder } = await req.json();
    if (!roomId || !name) return NextResponse.json({ error: 'roomId and name required' }, { status: 400 });

    const item = await prisma.productionItem.create({
        data: { roomId, name, quantity: quantity ?? 1, notes: notes || '', sortOrder: sortOrder ?? 0 }
    });
    return NextResponse.json(item, { status: 201 });
});
