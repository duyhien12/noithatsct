import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const items = await prisma.workOrderQCItem.findMany({
        where: { workOrderId: id },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return NextResponse.json(items);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { item, sortOrder } = await request.json();
    if (!item?.trim()) return NextResponse.json({ error: 'item required' }, { status: 400 });

    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const qcItem = await prisma.workOrderQCItem.create({
        data: { workOrderId: id, item: item.trim(), sortOrder: sortOrder || 0 },
    });
    return NextResponse.json(qcItem, { status: 201 });
});

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { itemId, status, note } = await request.json();
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

    const record = await prisma.workOrderQCItem.findFirst({ where: { id: itemId, workOrderId: id } });
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.workOrderQCItem.update({
        where: { id: itemId },
        data: {
            status: status || record.status,
            note: note !== undefined ? note : record.note,
            checkedBy: status && status !== 'pending' ? (session?.user?.name || '') : record.checkedBy,
            checkedAt: status && status !== 'pending' ? new Date() : record.checkedAt,
        },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

    await prisma.workOrderQCItem.deleteMany({ where: { id: itemId, workOrderId: id } });
    return NextResponse.json({ success: true });
});
