import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const template = await prisma.contractProcessTemplate.findUnique({
        where: { id },
        include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(template);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { name, type, description, isDefault } = body;
    const template = await prisma.contractProcessTemplate.update({
        where: { id },
        data: { name, type, description, isDefault },
        include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });
    return NextResponse.json(template);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.contractProcessTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
