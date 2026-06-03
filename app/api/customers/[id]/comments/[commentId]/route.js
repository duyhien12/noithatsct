import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { commentId } = await params;
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Nội dung không được trống' }, { status: 400 });
    const updated = await prisma.customerComment.update({
        where: { id: commentId },
        data: { content: content.trim() },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { commentId } = await params;
    await prisma.$executeRaw`DELETE FROM "CustomerComment" WHERE id = ${commentId}`;
    return NextResponse.json({ success: true });
});
