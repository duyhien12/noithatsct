import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const category = searchParams.get('productCategory');

    const where = {};
    if (activeOnly) where.isActive = true;
    if (category) where.OR = [{ productCategory: category }, { productCategory: '' }];

    const templates = await prisma.mfgStageTemplate.findMany({
        where,
        orderBy: { sequence: 'asc' },
    });
    return NextResponse.json(templates);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { name, description, sequence, productCategory, defaultDurationHours, isRequired } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Tên công đoạn bắt buộc' }, { status: 400 });

    const count = await prisma.mfgStageTemplate.count();
    const code = `CD${String(count + 1).padStart(3, '0')}`;

    const template = await prisma.mfgStageTemplate.create({
        data: {
            code,
            name: name.trim(),
            description: description || '',
            sequence: sequence ?? (count + 1) * 10,
            productCategory: productCategory || '',
            defaultDurationHours: Number(defaultDurationHours) || 0,
            isRequired: isRequired ?? true,
        },
    });
    return NextResponse.json(template, { status: 201 });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd', 'xuong'] });
