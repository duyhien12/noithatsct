import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Finds or creates a Product by code — used for linking WorkItemLibrary to inventory
export const POST = withAuth(async (request) => {
    const { code, name, unit, supplier, importPrice } = await request.json();
    if (!code) return NextResponse.json({ error: 'code bắt buộc' }, { status: 400 });

    const price = Number(importPrice) || 0;

    // upsert avoids race conditions between findUnique + create
    const product = await prisma.product.upsert({
        where: { code },
        create: {
            code,
            name: name || code,
            unit: unit || '',
            supplier: supplier || 'Hạng mục thi công',
            category: 'Hạng mục thi công',
            importPrice: price,
            salePrice: 0,
        },
        update: price > 0 ? { importPrice: price } : {},
    });

    return NextResponse.json(product);
});
