import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const orders = await prisma.productionOrder.findMany({
        include: {
            project: { select: { id: true, code: true, name: true, status: true } },
            floors: {
                include: {
                    rooms: {
                        include: { items: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(orders);
});

export const POST = withAuth(async (req, ctx, session) => {
    const { projectId, notes } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const existing = await prisma.productionOrder.findUnique({ where: { projectId } });
    if (existing) return NextResponse.json({ error: 'Dự án này đã có đơn sản xuất' }, { status: 409 });

    const order = await prisma.productionOrder.create({
        data: { projectId, notes: notes || '', createdBy: session?.user?.name || '' },
        include: { project: { select: { id: true, code: true, name: true } }, floors: true }
    });
    return NextResponse.json(order, { status: 201 });
});
