import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, _ctx, session) => {
    const role = session?.user?.role || '';
    const EXCLUDED_SUPPLIERS = ['Thái', 'An Cường', 'Kho nội thất'];

    const allProducts = await prisma.product.findMany({
        select: {
            id: true, code: true, name: true, category: true,
            unit: true, stock: true, minStock: true,
            importPrice: true, salePrice: true,
            supplier: true,
            categoryRef: { select: { supplier: true } },
        },
        orderBy: { name: 'asc' },
    });

    const products = role === 'xay_dung'
        ? allProducts.filter(p =>
            !EXCLUDED_SUPPLIERS.includes(p.supplier) &&
            !EXCLUDED_SUPPLIERS.includes(p.categoryRef?.supplier || '')
          )
        : allProducts;

    const lowStock = products.filter(p => p.stock <= p.minStock && p.minStock > 0);

    return NextResponse.json({ products, lowStock: lowStock.length });
});
