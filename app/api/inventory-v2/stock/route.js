import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasInvPermission } from '@/lib/inventoryV2/permissions';

const MS_PER_DAY = 86400000;

/**
 * Tồn kho hiện tại (mục 9 spec) — đọc từ InvStockBalance (bảng tự tổng hợp, KHÔNG cho sửa
 * trực tiếp), không tính lại từ sổ kho mỗi lần gọi (đã được costing.js duy trì nhất quán).
 *
 * Ghi chú v1: "Đang về" luôn = 0 (chưa nối PurchaseOrder — thiết kế để nối sau, xem kế hoạch);
 * "Cần mua" dùng công thức theo mức tồn tối thiểu (max(0, minStock - khả dụng)) vì chưa có
 * nguồn "nhu cầu sản xuất" hợp nhất qua InvMaterial — cột "Nhu cầu sắp tới" hiển thị riêng
 * số đã giữ (reservedQty) để tham khảo.
 */
export const GET = withAuth(async (request, ctx, session) => {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const q = (searchParams.get('q') || '').trim();
    const filter = searchParams.get('filter'); // 'reorder' | 'low' | 'idle'
    const idleDays = Number(searchParams.get('idleDays')) || 0;

    const balances = await prisma.invStockBalance.findMany({
        where: {
            ...(warehouseId ? { warehouseId } : {}),
            material: {
                ...(categoryId ? { categoryId } : {}),
                ...(supplierId ? { defaultSupplierId: supplierId } : {}),
                ...(q ? { OR: [{ sku: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { colorCode: { contains: q, mode: 'insensitive' } }] } : {}),
            },
        },
        include: {
            material: { include: { category: { select: { id: true, name: true } }, stockUnit: { select: { id: true, code: true } } } },
            warehouse: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    const canViewCost = hasInvPermission(session.user, 'view_cost');
    const now = Date.now();

    let rows = balances.map(b => {
        const onHandQty = Number(b.onHandQty);
        const reservedQty = Number(b.reservedQty);
        const availableQty = onHandQty - reservedQty;
        const incomingQty = 0; // v1: chưa nối PurchaseOrder
        const minStock = Number(b.material.minStock || 0);
        const toPurchase = Math.max(0, minStock - availableQty - incomingQty);
        const lastMoveDate = [b.lastInDate, b.lastOutDate].filter(Boolean).sort((a, c) => new Date(c) - new Date(a))[0] || null;
        const daysSinceLastMovement = lastMoveDate ? Math.floor((now - new Date(lastMoveDate).getTime()) / MS_PER_DAY) : null;
        const needsReorder = onHandQty <= 0 || (minStock > 0 && availableQty <= minStock);

        return {
            materialId: b.materialId, warehouseId: b.warehouseId,
            sku: b.material.sku, name: b.material.name, image: b.material.image,
            category: b.material.category, unit: b.material.stockUnit,
            warehouse: b.warehouse,
            onHandQty, reservedQty, availableQty, incomingQty,
            minStock, maxStock: Number(b.material.maxStock || 0),
            upcomingDemand: reservedQty, toPurchase,
            avgCost: canViewCost ? Number(b.avgCost) : undefined,
            stockValue: canViewCost ? onHandQty * Number(b.avgCost) : undefined,
            lastInDate: b.lastInDate, lastOutDate: b.lastOutDate, daysSinceLastMovement,
            needsReorder,
            status: onHandQty <= 0 ? 'HET_HANG' : needsReorder ? 'CAN_DAT_LAI' : 'BINH_THUONG',
        };
    });

    if (filter === 'reorder') rows = rows.filter(r => r.needsReorder);
    else if (filter === 'low') rows = rows.filter(r => r.minStock > 0 && r.availableQty <= r.minStock);
    else if (filter === 'idle') rows = rows.filter(r => r.daysSinceLastMovement == null || r.daysSinceLastMovement >= (idleDays || 180));

    return NextResponse.json({
        data: rows,
        totalSku: new Set(rows.map(r => r.materialId)).size,
        totalValue: canViewCost ? rows.reduce((s, r) => s + (r.stockValue || 0), 0) : undefined,
        reorderCount: rows.filter(r => r.needsReorder).length,
    });
});
