import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasInvPermission } from '@/lib/inventoryV2/permissions';

const MS_PER_DAY = 86400000;

export const GET = withAuth(async (request, ctx, session) => {
    const canViewCost = hasInvPermission(session.user, 'view_cost');
    const now = new Date();

    const [totalSku, balances, activeReservations, remnants, monthStocktakeLines, ledgerLast30d] = await Promise.all([
        prisma.invMaterial.count({ where: { status: 'Đang sử dụng' } }),
        prisma.invStockBalance.findMany({ include: { material: { select: { minStock: true, categoryId: true } } } }),
        prisma.invStockReservation.findMany({ where: { status: 'ACTIVE' }, include: { material: false } }),
        prisma.invMaterialRemnant.findMany({ where: { status: 'USABLE' }, select: { materialId: true, warehouseId: true } }),
        prisma.invStocktakeLine.findMany({
            where: { stocktake: { status: 'APPROVED', approvedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } },
            select: { varianceValue: true },
        }),
        prisma.invStockLedger.findMany({
            where: { postedAt: { gte: new Date(now.getTime() - 30 * MS_PER_DAY) } },
            select: { postedAt: true, direction: true, quantity: true },
        }),
    ]);

    let totalValue = 0, belowMinCount = 0, shortForProductionCount = 0;
    let idle30 = 0, idle60 = 0, idle90 = 0, idle180 = 0;
    const balanceKey = (materialId, warehouseId) => `${materialId}__${warehouseId}`;
    const balanceMap = new Map();

    for (const b of balances) {
        const onHand = Number(b.onHandQty);
        const reserved = Number(b.reservedQty);
        const available = onHand - reserved;
        const minStock = Number(b.material.minStock || 0);
        totalValue += onHand * Number(b.avgCost);
        balanceMap.set(balanceKey(b.materialId, b.warehouseId), b);
        if (minStock > 0 && available <= minStock) belowMinCount++;
        if (minStock > 0 && available < minStock) shortForProductionCount++;

        const lastMove = [b.lastInDate, b.lastOutDate].filter(Boolean).sort((a, c) => new Date(c) - new Date(a))[0];
        const days = lastMove ? Math.floor((now.getTime() - new Date(lastMove).getTime()) / MS_PER_DAY) : null;
        if (days != null) {
            if (days >= 30) idle30++;
            if (days >= 60) idle60++;
            if (days >= 90) idle90++;
            if (days >= 180) idle180++;
        }
    }

    let reservedValue = 0;
    for (const r of activeReservations) {
        const b = balanceMap.get(balanceKey(r.materialId, r.warehouseId));
        if (b) reservedValue += Number(r.quantity) * Number(b.avgCost);
    }

    let remnantValue = 0;
    for (const rm of remnants) {
        const b = balanceMap.get(balanceKey(rm.materialId, rm.warehouseId));
        if (b) remnantValue += Number(b.onHandQty) * Number(b.avgCost);
    }

    const shrinkageThisMonth = monthStocktakeLines.reduce((s, l) => s + Math.min(0, Number(l.varianceValue)), 0);
    const stocktakeVariance = monthStocktakeLines.reduce((s, l) => s + Number(l.varianceValue), 0);

    const trendByDay = {};
    for (const row of ledgerLast30d) {
        const key = new Date(row.postedAt).toISOString().slice(0, 10);
        trendByDay[key] = trendByDay[key] || { date: key, inQty: 0, outQty: 0 };
        if (row.direction === 'IN') trendByDay[key].inQty += Number(row.quantity);
        else trendByDay[key].outQty += Number(row.quantity);
    }
    const trend = Object.values(trendByDay).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
        totalSku,
        totalValue: canViewCost ? totalValue : undefined,
        belowMinCount, shortForProductionCount,
        orderedNotArrivedCount: 0, // v1: chưa nối PurchaseOrder
        idle30, idle60, idle90, idle180,
        reservedValue: canViewCost ? reservedValue : undefined,
        remnantValue: canViewCost ? remnantValue : undefined,
        shrinkageThisMonth: canViewCost ? shrinkageThisMonth : undefined,
        stocktakeVariance: canViewCost ? stocktakeVariance : undefined,
        trend,
        alerts: [
            { key: 'belowMin', label: 'Dưới mức tồn tối thiểu', count: belowMinCount, query: '/inventory-v2/stock?filter=low' },
            { key: 'reorder', label: 'Cần đặt hàng', count: shortForProductionCount, query: '/inventory-v2/stock?filter=reorder' },
            { key: 'idle180', label: 'Không phát sinh trên 6 tháng', count: idle180, query: '/inventory-v2/stock?filter=idle&idleDays=180' },
        ],
    });
});
