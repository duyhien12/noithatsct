import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, _ctx, session) => {
    const role = session?.user?.role || '';
    const where = role === 'xay_dung'
        ? { NOT: { supplier: { in: ['Thái', 'An Cường'] } } }
        : {};

    const products = await prisma.product.findMany({
        where,
        select: {
            id: true, code: true, name: true, category: true,
            unit: true, stock: true, minStock: true,
            importPrice: true, salePrice: true,
        },
        orderBy: { name: 'asc' },
    });

    const lowStock = products.filter(p => p.stock <= p.minStock && p.minStock > 0);

    return NextResponse.json({ products, lowStock: lowStock.length });
});
