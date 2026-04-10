import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    let products;
    if (role === 'xuong') {
        // Xưởng nội thất: chỉ hiện sản phẩm Kho nội thất
        products = allProducts.filter(p =>
            p.supplier === 'Kho nội thất' ||
            p.categoryRef?.supplier === 'Kho nội thất'
        );
    } else if (role === 'xay_dung') {
        products = allProducts.filter(p =>
            !EXCLUDED_SUPPLIERS.includes(p.supplier) &&
            !EXCLUDED_SUPPLIERS.includes(p.categoryRef?.supplier || '')
        );
    } else {
        products = allProducts;
    }

    const lowStock = products.filter(p => p.stock <= p.minStock && p.minStock > 0);

    return NextResponse.json({ products, lowStock: lowStock.length });
});
