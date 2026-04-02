import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Finds or creates a Product by code — used for linking WorkItemLibrary to inventory
export const POST = withAuth(async (request) => {
    const { code, name, unit, supplier } = await request.json();
    if (!code) return NextResponse.json({ error: 'code bắt buộc' }, { status: 400 });

    const existing = await prisma.product.findUnique({ where: { code } });
    if (existing) return NextResponse.json(existing);

    const product = await prisma.product.create({
        data: {
            code,
            name: name || code,
            unit: unit || '',
            supplier: supplier || 'Hạng mục thi công',
            category: 'Hạng mục thi công',
            importPrice: 0,
            salePrice: 0,
        },
    });

    return NextResponse.json(product, { status: 201 });
});
