import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const attributes = await prisma.productAttribute.findMany({
        where: { productId: id },
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
    });
    return NextResponse.json(attributes);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { name, inputType = 'select', required = true, order = 0 } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Tên thuộc tính bắt buộc' }, { status: 400 });
    const attribute = await prisma.productAttribute.create({
        data: { productId: id, name: name.trim(), inputType, required, order },
        include: { options: true },
    });
    return NextResponse.json(attribute, { status: 201 });
});

// Apply variant template → copy into ProductAttribute + Options
export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { templateId } = await request.json();
    if (!templateId) return NextResponse.json({ error: 'Thiếu templateId' }, { status: 400 });

    const template = await prisma.variantTemplate.findUnique({
        where: { id: templateId },
        include: { options: { orderBy: { order: 'asc' } } },
    });
    if (!template) return NextResponse.json({ error: 'Template không tồn tại' }, { status: 404 });

    const count = await prisma.productAttribute.count({ where: { productId: id } });
    const attribute = await prisma.productAttribute.create({
        data: {
            productId: id,
            name: template.name,
            inputType: template.inputType,
            required: template.required,
            order: count,
            options: {
                create: template.options.map((o, i) => ({
                    label: o.label,
                    priceAddon: o.priceAddon,
                    order: i,
                })),
            },
        },
        include: { options: true },
    });
    return NextResponse.json(attribute, { status: 201 });
});
