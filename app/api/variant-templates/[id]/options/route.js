import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { label, priceAddon } = await request.json();
    if (!label?.trim()) return NextResponse.json({ error: 'Nhãn bắt buộc' }, { status: 400 });

    const count = await prisma.variantTemplateOption.count({ where: { templateId: id } });
    const option = await prisma.variantTemplateOption.create({
        data: { templateId: id, label: label.trim(), priceAddon: Number(priceAddon) || 0, order: count },
    });
    return NextResponse.json(option, { status: 201 });
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const optionId = searchParams.get('optionId');
    if (!optionId) return NextResponse.json({ error: 'Thiếu optionId' }, { status: 400 });
    await prisma.variantTemplateOption.delete({ where: { id: optionId } });
    return NextResponse.json({ success: true });
});
