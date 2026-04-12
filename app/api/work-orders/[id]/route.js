import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { workOrderUpdateSchema } from '@/lib/validations/workOrder';
import { notifyWorkOrderAssigned } from '@/lib/notify';

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

    const existing = await prisma.workOrder.findUnique({ where: { id }, select: { assignee: true } });
    const order = await prisma.workOrder.update({
        where: { id },
        data,
        include: { project: { select: { name: true, code: true } } },
    });

    // Thông báo khi assignee thay đổi (giao lại cho người khác)
    if (data.assignee && data.assignee !== existing?.assignee) {
        notifyWorkOrderAssigned(order).catch(e => console.error('[work-orders PUT] notify lỗi:', e));
    }

    return NextResponse.json(order);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.workOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
