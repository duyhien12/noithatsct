import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { workOrderUpdateSchema } from '@/lib/validations/workOrder';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.workOrder.findUnique({
        where: { id },
        include: { project: { select: { id: true, name: true, code: true, address: true } } },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = workOrderUpdateSchema.parse(body);
    if (data.status === 'Hoàn thành' && !data.completedAt) {
        data.completedAt = new Date();
    }
    const order = await prisma.workOrder.update({ where: { id }, data });
    return NextResponse.json(order);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.workOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
