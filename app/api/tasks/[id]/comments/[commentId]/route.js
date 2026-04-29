import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (request, { params }) => {
    const { commentId } = await params;
    await prisma.taskComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
});
