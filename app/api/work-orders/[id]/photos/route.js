import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const photos = await prisma.workOrderPhoto.findMany({
        where: { workOrderId: id },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(photos);
});

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { url, caption, type } = await request.json();
    if (!url?.trim()) return NextResponse.json({ error: 'url required' }, { status: 400 });

    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const photo = await prisma.workOrderPhoto.create({
        data: {
            workOrderId: id,
            url: url.trim(),
            caption: caption || '',
            type: type || 'evidence',
            uploadedBy: session?.user?.name || '',
        },
    });
    return NextResponse.json(photo, { status: 201 });
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');
    if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 });

    await prisma.workOrderPhoto.deleteMany({ where: { id: photoId, workOrderId: id } });
    return NextResponse.json({ success: true });
});
