import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/admin/diagnostic — show supplier distribution and raw values
export const GET = withAuth(async () => {
    const products = await prisma.product.findMany({ select: { supplier: true } });
    const dist = {};
    for (const p of products) {
        const key = JSON.stringify(p.supplier);
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

// POST /api/admin/diagnostic — fix category supplier assignments on production
export const POST = withAuth(async () => {
    const cats = await prisma.productCategory.findMany({ select: { id: true, name: true } });
    let updated = 0;
    for (const c of cats) {
        const n = c.name.toLowerCase();
        let supplier = '';
        if (n.includes('thái') || n.includes('thai')) supplier = 'Thái';
        else if (n.includes('an cường') || n.includes('an cuong') || n.endsWith(' ac') || / ac$/i.test(c.name) || n.includes('inox') || n.includes('mdf') || n.includes('nhựa ac') || n.includes('sàn gỗ') || n.includes('san go') || n.startsWith('pk ')) supplier = 'An Cường';
        if (supplier) {
            await prisma.productCategory.update({ where: { id: c.id }, data: { supplier } }).catch(() => {});
            updated++;
        }
    }
    return NextResponse.json({ updated, total: cats.length });
});
