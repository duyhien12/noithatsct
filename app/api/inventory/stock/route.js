import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, _ctx, session) => {
    const role = session?.user?.role || '';
    const { searchParams } = new URL(request.url);
    const withAnalytics = searchParams.get('analytics') === '1';
    const EXCLUDED_SUPPLIERS = ['Thái', 'An Cường', 'Kho nội thất'];

    const allProducts = await prisma.product.findMany({
        select: {
            id: true, code: true, name: true, category: true,
            unit: true, stock: true, minStock: true,
            importPrice: true, salePrice: true,
            supplier: true, origin: true, description: true,
            categoryRef: { select: { supplier: true } },
        },
        orderBy: { name: 'asc' },
    });

    let products;
    if (role === 'xuong') {
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

    if (!withAnalytics) {
        return NextResponse.json({ products, lowStock: lowStock.length });
    }

    // ── Analytics ───────────────────────────────────────────────────────────
    const productIds = products.map(p => p.id);
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d60 = new Date(now.getTime() - 60 * 86400000);

    const [txLast30, txPrev30, reservedRaw] = await Promise.all([
        prisma.inventoryTransaction.groupBy({
            by: ['productId'],
            where: { productId: { in: productIds }, type: 'Xuất', date: { gte: d30 } },
            _sum: { quantity: true },
        }),
        prisma.inventoryTransaction.groupBy({
            by: ['productId'],
            where: { productId: { in: productIds }, type: 'Xuất', date: { gte: d60, lt: d30 } },
            _sum: { quantity: true },
        }),
        prisma.workshopTaskMaterial.groupBy({
            by: ['productId'],
            where: {
                productId: { in: productIds },
                task: { status: { notIn: ['Hoàn thành'] } },
            },
            _sum: { quantity: true },
        }),
    ]);

    const last30Map = Object.fromEntries(txLast30.map(t => [t.productId, t._sum.quantity || 0]));
    const prev30Map = Object.fromEntries(txPrev30.map(t => [t.productId, t._sum.quantity || 0]));
    const reservedMap = Object.fromEntries(reservedRaw.map(r => [r.productId, r._sum.quantity || 0]));

    const productsWithAnalytics = products.map(p => {
        const reservedQty = Math.round((reservedMap[p.id] || 0) * 100) / 100;
        const availableQty = Math.max(0, p.stock - reservedQty);
        const consumption30d = last30Map[p.id] || 0;
        const consumptionPrev30d = prev30Map[p.id] || 0;
        const avgDaily = consumption30d / 30;
        const daysToStockout = avgDaily > 0 ? Math.round(availableQty / avgDaily) : null;

        let trend = 'stable';
        if (consumptionPrev30d > 0) {
            const ratio = consumption30d / consumptionPrev30d;
            if (ratio > 1.2) trend = 'up';
            else if (ratio < 0.8) trend = 'down';
        } else if (consumption30d > 0) {
            trend = 'up';
        }

        const needsReorder = (p.minStock > 0 && p.stock <= p.minStock) ||
            (daysToStockout !== null && daysToStockout <= 7);

        return {
            ...p,
            reservedQty,
            availableQty,
            consumption30d,
            consumptionPrev30d,
            avgDaily,
            daysToStockout,
            trend,
            needsReorder,
        };
    });

    const reorderAlerts = productsWithAnalytics.filter(p => p.needsReorder).length;
    const totalReserved = productsWithAnalytics.reduce((s, p) => s + p.reservedQty, 0);

    return NextResponse.json({
        products: productsWithAnalytics,
        lowStock: lowStock.length,
        reorderAlerts,
        totalReserved,
    });
});
