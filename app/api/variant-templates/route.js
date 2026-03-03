import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const templates = await prisma.variantTemplate.findMany({
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
});

export const POST = withAuth(async (request) => {
    const { name, inputType, required, options } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Tên bắt buộc' }, { status: 400 });

    const template = await prisma.variantTemplate.create({
        data: {
            name: name.trim(),
            inputType: inputType || 'select',
            required: required ?? true,
            options: options?.length ? {
                create: options.map((o, i) => ({
                    label: o.label,
                    priceAddon: Number(o.priceAddon) || 0,
                    order: i,
                })),
            } : undefined,
        },
        include: { options: true },
    });
    return NextResponse.json(template, { status: 201 });
});
