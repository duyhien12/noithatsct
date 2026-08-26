/**
 * Engine giá vốn bình quân gia quyền liên hoàn cho Kho vật tư xưởng 2.0.
 *
 * ĐÂY LÀ ĐIỂM DUY NHẤT được phép ghi InvStockLedger / cập nhật InvStockBalance.
 * Mọi route ảnh hưởng tồn kho (duyệt phiếu nhập/xuất/điều chuyển, duyệt kiểm kê...)
 * PHẢI gọi postLedgerEntry() hoặc postTransfer() bên trong cùng 1 prisma.$transaction —
 * không được tự ý update InvStockBalance / insert InvStockLedger ở nơi khác.
 *
 * Công thức:
 *  - Nhập:  avgCost mới = (tồn cũ × giá cũ + SL nhập × giá nhập) / (tồn cũ + SL nhập)
 *  - Xuất:  kiểm tra SL xuất ≤ tồn − đã giữ (trừ khi allowNegative); giá vốn giữ nguyên
 *  - Điều chuyển: xuất kho nguồn theo avgCost nguồn, nhập kho đích mang đúng giá đó
 *    → tổng giá trị toàn công ty không đổi.
 *
 * InvStockLedger là sổ kho append-only (nguồn dữ liệu gốc, không sửa/xóa).
 * InvStockBalance là bảng số dư tự động tổng hợp (không cho người dùng sửa trực tiếp).
 */

/**
 * Khóa (FOR UPDATE) và đảm bảo tồn tại dòng InvStockBalance cho (materialId, warehouseId).
 * Phải gọi trong transaction — giữ khóa tới hết transaction, tránh 2 phiếu duyệt cùng lúc
 * làm sai giá bình quân.
 */
export async function lockBalance(tx, materialId, warehouseId) {
    await tx.invStockBalance.upsert({
        where: { materialId_warehouseId: { materialId, warehouseId } },
        create: { materialId, warehouseId, onHandQty: 0, reservedQty: 0, avgCost: 0 },
        update: {},
    });
    const rows = await tx.$queryRawUnsafe(
        `SELECT * FROM "InvStockBalance" WHERE "materialId" = $1 AND "warehouseId" = $2 FOR UPDATE`,
        materialId, warehouseId
    );
    return rows[0];
}

export class InsufficientStockError extends Error {
    constructor(message, detail) {
        super(message);
        this.name = 'InsufficientStockError';
        this.detail = detail;
    }
}

/**
 * Ghi 1 dòng sổ kho (IN hoặc OUT) + cập nhật InvStockBalance.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{
 *   materialId: string, warehouseId: string, locationId?: string|null,
 *   direction: 'IN'|'OUT', quantity: number, unitCost?: number,
 *   documentId: string, documentLineId?: string|null,
 *   session?: object, note?: string, allowNegative?: boolean,
 * }} p
 */
export async function postLedgerEntry(tx, p) {
    const { materialId, warehouseId, locationId = null, direction, documentId, documentLineId = null, session, note = '' } = p;
    const quantity = Number(p.quantity);
    if (!(quantity > 0)) throw new Error('Số lượng ghi sổ phải lớn hơn 0');
    if (direction !== 'IN' && direction !== 'OUT') throw new Error(`direction không hợp lệ: ${direction}`);

    const balance = await lockBalance(tx, materialId, warehouseId);
    const onHand = Number(balance.onHandQty);
    const reserved = Number(balance.reservedQty);
    const avgCost = Number(balance.avgCost);

    let newOnHand, newAvgCost, unitCostAtPosting;

    if (direction === 'IN') {
        const inUnitCost = Number(p.unitCost) || 0;
        newOnHand = onHand + quantity;
        newAvgCost = newOnHand > 0 ? ((onHand * avgCost) + (quantity * inUnitCost)) / newOnHand : inUnitCost;
        unitCostAtPosting = inUnitCost;
    } else {
        const available = onHand - reserved;
        if (quantity > available && !p.allowNegative) {
            throw new InsufficientStockError(
                `Không đủ tồn khả dụng để xuất (khả dụng: ${available}, cần xuất: ${quantity})`,
                { available, requested: quantity, onHand, reserved }
            );
        }
        newOnHand = onHand - quantity;
        newAvgCost = avgCost; // xuất không làm đổi giá vốn bình quân
        unitCostAtPosting = avgCost;
    }

    const updatedBalance = await tx.invStockBalance.update({
        where: { id: balance.id },
        data: {
            onHandQty: newOnHand,
            avgCost: newAvgCost,
            ...(direction === 'IN' ? { lastInDate: new Date() } : { lastOutDate: new Date() }),
        },
    });

    // Cập nhật giá tham chiếu nhanh trên InvMaterial để hiển thị — nguồn thật là InvStockBalance
    await tx.invMaterial.update({
        where: { id: materialId },
        data: direction === 'IN'
            ? { avgCost: newAvgCost, lastImportPrice: unitCostAtPosting }
            : { avgCost: newAvgCost },
    });

    const ledgerRow = await tx.invStockLedger.create({
        data: {
            materialId, warehouseId, locationId,
            documentId, documentLineId,
            direction, quantity,
            unitCostAtPosting,
            amount: quantity * unitCostAtPosting,
            balanceQtyAfter: newOnHand,
            balanceAvgCostAfter: newAvgCost,
            postedById: session?.user?.id || '',
            note,
        },
    });

    if (direction === 'OUT' && p.allowNegative && quantity > (onHand - reserved)) {
        const { writeInvAudit } = await import('./audit.js');
        await writeInvAudit(tx, {
            entityType: 'InvDocument', entityId: documentId, action: 'negative_stock_override',
            session, note: `Duyệt xuất vượt khả dụng: khả dụng ${onHand - reserved}, xuất ${quantity}`,
        });
    }

    return { ledgerRow, balance: updatedBalance, unitCostAtPosting };
}

/**
 * Điều chuyển kho: xuất kho nguồn (theo avgCost hiện tại của kho nguồn),
 * nhập kho đích mang đúng giá đó → tổng giá trị toàn công ty không đổi.
 */
export async function postTransfer(tx, p) {
    const {
        materialId, sourceWarehouseId, targetWarehouseId,
        sourceLocationId = null, targetLocationId = null,
        quantity, documentId, sourceLineId = null, targetLineId = null,
        session, allowNegative,
    } = p;

    const out = await postLedgerEntry(tx, {
        materialId, warehouseId: sourceWarehouseId, locationId: sourceLocationId,
        direction: 'OUT', quantity, documentId, documentLineId: sourceLineId,
        session, note: 'Điều chuyển kho (xuất kho nguồn)', allowNegative,
    });

    const inn = await postLedgerEntry(tx, {
        materialId, warehouseId: targetWarehouseId, locationId: targetLocationId,
        direction: 'IN', quantity, unitCost: out.unitCostAtPosting, documentId, documentLineId: targetLineId,
        session, note: 'Điều chuyển kho (nhập kho đích)',
    });

    return { out, in: inn };
}
