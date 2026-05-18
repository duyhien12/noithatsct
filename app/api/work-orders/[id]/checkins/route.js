import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const checkins = await prisma.workOrderCheckin.findMany({
        where: { workOrderId: id },
        orderBy: { checkinAt: 'desc' },
    });
    return NextResponse.json(checkins);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { workerName, notes } = await request.json();
    if (!workerName?.trim()) return NextResponse.json({ error: 'workerName required' }, { status: 400 });

    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const checkin = await prisma.workOrderCheckin.create({
        data: { workOrderId: id, workerName: workerName.trim(), notes: notes || '' },
    });
    return NextResponse.json(checkin, { status: 201 });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { checkinId } = await request.json();
    if (!checkinId) return NextResponse.json({ error: 'checkinId required' }, { status: 400 });

    const record = await prisma.workOrderCheckin.findFirst({ where: { id: checkinId, workOrderId: id } });
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (record.checkoutAt) return NextResponse.json({ error: 'Already checked out' }, { status: 400 });

    const updated = await prisma.workOrderCheckin.update({
        where: { id: checkinId },
        data: { checkoutAt: new Date() },
    });
    return NextResponse.json(updated);
});
