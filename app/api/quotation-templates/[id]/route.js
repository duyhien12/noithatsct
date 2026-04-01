import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const template = await prisma.quotationTemplate.findUnique({
        where: { id },
        include: { categories: { include: { items: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
    });
    if (!template) return NextResponse.json({ error: 'Không tìm thấy mẫu' }, { status: 404 });
    return NextResponse.json(template);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { categories, ...data } = await request.json();

    // Delete old categories (cascade deletes items)
    await prisma.quotationTemplateCategory.deleteMany({ where: { templateId: id } });

    const template = await prisma.quotationTemplate.update({
        where: { id },
        data: {
            ...data,
            categories: categories ? {
                create: categories.map((cat, ci) => ({
                    name: cat.name,
                    order: ci,
                    items: {
                        create: (cat.items || []).map((item, ii) => ({
                            name: item.name,
                            order: ii,
                            unit: item.unit || '',
                            quantity: item.quantity || 0,
                            mainMaterial: item.mainMaterial || 0,
                            auxMaterial: item.auxMaterial || 0,
                            labor: item.labor || 0,
                            unitPrice: item.unitPrice || 0,
                            description: item.description || '',
                        })),
                    },
                })),
            } : undefined,
        },
        include: { categories: { include: { items: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
    });
    return NextResponse.json(template);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.quotationTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
