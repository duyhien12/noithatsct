import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.projectDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
