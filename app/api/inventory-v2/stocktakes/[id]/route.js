import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const stocktake = await prisma.invStocktake.findUnique({
        where: { id },
        include: {
            warehouse: true,
            lines: {
                include: { material: { select: { id: true, sku: true, name: true, stockUnit: { select: { code: true } } } }, location: { select: { id: true, name: true } } },
                orderBy: { id: 'asc' },
            },
        },
    });
    if (!stocktake) return NextResponse.json({ error: 'Không tìm thấy phiếu kiểm kê' }, { status: 404 });
    return NextResponse.json(stocktake);
});

/** Nhập số lượng đếm thực tế cho từng dòng — chỉ cho phép khi phiếu đang ở trạng thái COUNTING. */
export const PUT = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'stocktake');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const stocktake = await prisma.invStocktake.findUnique({ where: { id } });
    if (!stocktake) return NextResponse.json({ error: 'Không tìm thấy phiếu kiểm kê' }, { status: 404 });
    if (stocktake.status !== 'COUNTING') {
        return NextResponse.json({ error: 'Chỉ nhập số đếm khi phiếu đang ở trạng thái Đang đếm' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const updates = Array.isArray(body.lines) ? body.lines : [];

    await prisma.$transaction(updates.map(l => {
        const line = { countedQty: Number(l.countedQty), countedById: session.user.id, countedAt: new Date(), status: 'COUNTED' };
        return prisma.invStocktakeLine.update({ where: { id: l.id }, data: line });
    }));

    // Tính lại chênh lệch dựa trên avgCost hiện tại của từng vật tư trong đúng kho
    const lines = await prisma.invStocktakeLine.findMany({ where: { stocktakeId: id } });
    for (const line of lines) {
        if (line.countedQty == null) continue;
        const balance = await prisma.invStockBalance.findUnique({ where: { materialId_warehouseId: { materialId: line.materialId, warehouseId: stocktake.warehouseId } } });
        const varianceQty = Number(line.countedQty) - Number(line.systemQty);
        const varianceValue = varianceQty * Number(balance?.avgCost || 0);
        if (varianceQty !== line.varianceQty || varianceValue !== line.varianceValue) {
            await prisma.invStocktakeLine.update({ where: { id: line.id }, data: { varianceQty, varianceValue } });
        }
    }

    const result = await prisma.invStocktake.findUnique({ where: { id }, include: { lines: true } });
    return NextResponse.json(result);
});
