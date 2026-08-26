import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';
import { writeInvAudit } from '@/lib/inventoryV2/audit';
import { postLedgerEntry } from '@/lib/inventoryV2/costing';
import { withDailyCodeRetry } from '@/lib/generateCode';

export const POST = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'stocktake');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    const stocktake = await prisma.invStocktake.findUnique({ where: { id }, include: { lines: true } });
    if (!stocktake) return NextResponse.json({ error: 'Không tìm thấy phiếu kiểm kê' }, { status: 404 });

    if (action === 'start_count') {
        if (stocktake.status !== 'DRAFT') return NextResponse.json({ error: 'Chỉ bắt đầu đếm từ trạng thái Nháp' }, { status: 400 });
        const balances = await prisma.invStockBalance.findMany({
            where: { warehouseId: stocktake.warehouseId, ...(stocktake.scopeCategoryId ? { material: { categoryId: stocktake.scopeCategoryId } } : {}) },
        });
        const updated = await prisma.$transaction(async (tx) => {
            await tx.invStocktakeLine.createMany({
                data: balances.map(b => ({ stocktakeId: id, materialId: b.materialId, systemQty: Number(b.onHandQty) })),
            });
            const result = await tx.invStocktake.update({ where: { id }, data: { status: 'COUNTING' } });
            await writeInvAudit(tx, { entityType: 'InvStocktake', entityId: id, action: 'START_COUNT', fromStatus: 'DRAFT', toStatus: 'COUNTING', session });
            return result;
        });
        return NextResponse.json(updated);
    }

    if (action === 'submit') {
        if (stocktake.status !== 'COUNTING') return NextResponse.json({ error: 'Phiếu chưa ở trạng thái Đang đếm' }, { status: 400 });
        const notCounted = stocktake.lines.filter(l => l.countedQty == null);
        if (notCounted.length > 0) return NextResponse.json({ error: `Còn ${notCounted.length} dòng chưa nhập số đếm` }, { status: 400 });
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.invStocktake.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
            await writeInvAudit(tx, { entityType: 'InvStocktake', entityId: id, action: 'SUBMIT', fromStatus: 'COUNTING', toStatus: 'PENDING_APPROVAL', session });
            return result;
        });
        return NextResponse.json(updated);
    }

    if (action === 'approve') {
        if (stocktake.status !== 'PENDING_APPROVAL') return NextResponse.json({ error: 'Phiếu chưa ở trạng thái Chờ duyệt' }, { status: 400 });

        const updated = await prisma.$transaction(async (tx) => {
            for (const line of stocktake.lines) {
                if (!line.varianceQty) continue;
                const direction = line.varianceQty > 0 ? 'IN' : 'OUT';
                const docType = direction === 'IN' ? 'IMPORT_STOCKTAKE_ADJUST' : 'EXPORT_STOCKTAKE_ADJUST';
                const qty = Math.abs(line.varianceQty);

                const [balance, material] = await Promise.all([
                    tx.invStockBalance.findUnique({ where: { materialId_warehouseId: { materialId: line.materialId, warehouseId: stocktake.warehouseId } } }),
                    tx.invMaterial.findUniqueOrThrow({ where: { id: line.materialId } }),
                ]);
                const unitCost = Number(balance?.avgCost || 0);

                const doc = await withDailyCodeRetry('invDocument', 'PDC', (code) => tx.invDocument.create({
                    data: {
                        code, docType, direction, status: 'APPROVED', warehouseId: stocktake.warehouseId,
                        reason: `Điều chỉnh sau kiểm kê ${stocktake.code}`, createdById: session.user.id,
                        approvedById: session.user.id, approvedAt: new Date(), totalAmount: qty * unitCost,
                        lines: { create: [{ lineNo: 0, materialId: line.materialId, enteredQuantity: qty, enteredUnitId: material.stockUnitId, ratioToStockUsed: 1, quantity: qty, unitPrice: unitCost, amount: qty * unitCost }] },
                    },
                }));

                await postLedgerEntry(tx, {
                    materialId: line.materialId, warehouseId: stocktake.warehouseId, direction, quantity: qty, unitCost,
                    documentId: doc.id, session, note: `Điều chỉnh kiểm kê ${stocktake.code}`, allowNegative: true,
                });

                await tx.invStocktakeLine.update({ where: { id: line.id }, data: { status: 'RESOLVED' } });
            }

            const result = await tx.invStocktake.update({ where: { id }, data: { status: 'APPROVED', approvedById: session.user.id, approvedAt: new Date() } });
            await writeInvAudit(tx, { entityType: 'InvStocktake', entityId: id, action: 'APPROVE', fromStatus: 'PENDING_APPROVAL', toStatus: 'APPROVED', session });
            return result;
        });
        return NextResponse.json(updated);
    }

    if (action === 'cancel') {
        if (stocktake.status === 'APPROVED') return NextResponse.json({ error: 'Phiếu đã duyệt không thể hủy' }, { status: 400 });
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.invStocktake.update({ where: { id }, data: { status: 'CANCELLED' } });
            await writeInvAudit(tx, { entityType: 'InvStocktake', entityId: id, action: 'CANCEL', fromStatus: stocktake.status, toStatus: 'CANCELLED', session });
            return result;
        });
        return NextResponse.json(updated);
    }

    return NextResponse.json({ error: `Hành động không hợp lệ: ${action}` }, { status: 400 });
});
