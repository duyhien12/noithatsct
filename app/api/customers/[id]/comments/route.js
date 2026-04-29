import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const comments = await prisma.customerComment.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(comments);
});

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Thiếu nội dung' }, { status: 400 });

    const comment = await prisma.customerComment.create({
        data: {
            customerId: id,
            content: content.trim(),
            author: session?.user?.name || '',
        },
    });
    return NextResponse.json(comment, { status: 201 });
});
