import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/admin/diagnostic — show supplier distribution and raw values
export const GET = withAuth(async () => {
    const products = await prisma.product.findMany({
        select: { supplier: true },
    });

    const dist = {};
    for (const p of products) {
        const key = JSON.stringify(p.supplier); // show raw value including null/empty
        dist[key] = (dist[key] || 0) + 1;
    }

    const catSuppliers = await prisma.productCategory.findMany({
        select: { id: true, name: true, supplier: true },
    }).catch(() => []);

    return NextResponse.json({
        total: products.length,
        supplierDistribution: dist,
        categories: catSuppliers.map(c => ({ name: c.name, supplier: c.supplier })),
    });
});
