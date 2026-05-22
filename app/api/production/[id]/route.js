import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req, { params }) => {
    const { id } = await params;
    const order = await prisma.productionOrder.findUnique({
        where: { id },
        include: {
            project: { select: { id: true, code: true, name: true, status: true } },
            floors: {
                orderBy: { sortOrder: 'asc' },
                include: {
                    rooms: {
                        orderBy: { sortOrder: 'asc' },
                        include: {
                            items: { orderBy: { sortOrder: 'asc' } }
                        }
                    }
                }
            }
        }
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.productionOrder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
