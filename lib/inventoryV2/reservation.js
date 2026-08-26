import { lockBalance } from './costing.js';

/**
 * Giữ vật tư cho công trình/lệnh sản xuất — một bản ghi THẬT (khác hệ kho cũ suy luận live
 * từ WorkshopTaskMaterial). Chỉ tăng InvStockBalance.reservedQty, KHÔNG đụng onHandQty
 * → Khả dụng = onHand − reserved luôn nhất quán vì cùng transaction cập nhật cả hai.
 */
export async function activateReservation(tx, {
    materialId, warehouseId, projectId = null, mfgOrderId = null, scheduleTaskId = null,
    documentId, quantity, session, note = '', expiresAt = null,
}) {
    const qty = Number(quantity);
    if (!(qty > 0)) throw new Error('Số lượng giữ phải lớn hơn 0');

    const balance = await lockBalance(tx, materialId, warehouseId);
    const available = Number(balance.onHandQty) - Number(balance.reservedQty);
    if (qty > available) {
        throw new Error(`Không đủ khả dụng để giữ (khả dụng: ${available}, cần giữ: ${qty})`);
    }

    const reservation = await tx.invStockReservation.create({
        data: {
            materialId, warehouseId, projectId, mfgOrderId, scheduleTaskId, documentId,
            quantity: qty, status: 'ACTIVE',
            reservedById: session?.user?.id || '', note, expiresAt,
        },
    });

    await tx.invStockBalance.update({
        where: { id: balance.id },
        data: { reservedQty: { increment: qty } },
    });

    return reservation;
}

/**
 * Hủy giữ (RELEASED) hoặc đánh dấu đã dùng để xuất thật (CONSUMED) — cả hai đều
 * giải phóng reservedQty; CONSUMED chỉ nên gọi ngay trước khi postLedgerEntry(OUT) tương ứng.
 */
export async function deactivateReservation(tx, { reservationId, status = 'RELEASED', session, note = '' }) {
    const reservation = await tx.invStockReservation.findUniqueOrThrow({ where: { id: reservationId } });
    if (reservation.status !== 'ACTIVE') {
        throw new Error(`Phiếu giữ hàng đã ở trạng thái ${reservation.status}, không thể chuyển tiếp`);
    }

    const balance = await lockBalance(tx, reservation.materialId, reservation.warehouseId);

    const updated = await tx.invStockReservation.update({
        where: { id: reservationId },
        data: {
            status,
            releasedById: session?.user?.id || '',
            releasedAt: new Date(),
            note: note || reservation.note,
        },
    });

    await tx.invStockBalance.update({
        where: { id: balance.id },
        data: { reservedQty: { decrement: Number(reservation.quantity) } },
    });

    return updated;
}

/**
 * Khi duyệt phiếu xuất cho công trình/lệnh sản xuất, tự động giải phóng (CONSUMED) các
 * phiếu giữ hàng ACTIVE khớp cùng vật tư/kho/công trình/lệnh SX, ưu tiên phiếu giữ cũ nhất,
 * chỉ giải phóng trọn từng phiếu (không tách lẻ) cho tới khi đủ `quantity` xuất hoặc hết phiếu khớp.
 * Best-effort — phần dư không khớp được vẫn ở trạng thái ACTIVE (an toàn, chỉ làm khả dụng
 * hiển thị thấp hơn thực tế cho tới khi thủ kho tự hủy giữ thủ công).
 */
export async function autoConsumeReservations(tx, { materialId, warehouseId, projectId, mfgOrderId, scheduleTaskId, quantity, session }) {
    if (!projectId && !mfgOrderId && !scheduleTaskId) return [];
    const candidates = await tx.invStockReservation.findMany({
        where: {
            materialId, warehouseId, status: 'ACTIVE',
            OR: [
                ...(projectId ? [{ projectId }] : []),
                ...(mfgOrderId ? [{ mfgOrderId }] : []),
                ...(scheduleTaskId ? [{ scheduleTaskId }] : []),
            ],
        },
        orderBy: { reservedAt: 'asc' },
    });

    let remaining = Number(quantity);
    const consumed = [];
    for (const r of candidates) {
        if (remaining <= 0) break;
        if (Number(r.quantity) <= remaining) {
            await deactivateReservation(tx, { reservationId: r.id, status: 'CONSUMED', session, note: 'Tự động giải phóng khi xuất kho' });
            remaining -= Number(r.quantity);
            consumed.push(r.id);
        }
    }
    return consumed;
}
