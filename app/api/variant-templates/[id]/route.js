import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { name, inputType, required } = await request.json();
    const template = await prisma.variantTemplate.update({
        where: { id },
        data: {
            ...(name && { name: name.trim() }),
            ...(inputType && { inputType }),
            ...(required !== undefined && { required }),
        },
        include: { options: true },
    });
    return NextResponse.json(template);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.variantTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
