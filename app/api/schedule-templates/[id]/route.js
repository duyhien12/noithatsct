import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const template = await prisma.scheduleTemplate.findUnique({
        where: { id },
        include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(template);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.scheduleTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
