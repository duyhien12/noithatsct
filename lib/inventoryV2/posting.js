import { docTypeMeta } from './workflow';
import { postLedgerEntry, postTransfer } from './costing';
import { activateReservation, deactivateReservation, autoConsumeReservations } from './reservation';

/**
 * Điểm ghi sổ duy nhất khi duyệt phiếu — mọi cập nhật tồn kho/giữ hàng bắt buộc đi qua đây,
 * bên trong 1 prisma.$transaction. Dùng chung cho nút Duyệt (documents/[id]/actions) và Xuất nhanh
 * (quick-export).
 */
export async function postApprovedDocument(tx, document, session, allowNegative) {
    const meta = docTypeMeta(document.docType);

    if (meta.class === 'LEDGER') {
        for (const line of document.lines) {
            const result = await postLedgerEntry(tx, {
                materialId: line.materialId, warehouseId: document.warehouseId, locationId: line.locationId,
                direction: meta.direction, quantity: line.quantity, unitCost: line.unitPrice,
                documentId: document.id, documentLineId: line.id, session, allowNegative,
                note: meta.label,
            });
            await tx.invDocumentLine.update({ where: { id: line.id }, data: { avgCostAtPosting: result.unitCostAtPosting } });
        }
        if (meta.direction === 'OUT' && (document.projectId || document.mfgOrderId || document.scheduleTaskId)) {
            for (const line of document.lines) {
                await autoConsumeReservations(tx, {
                    materialId: line.materialId, warehouseId: document.warehouseId,
                    projectId: document.projectId, mfgOrderId: document.mfgOrderId, scheduleTaskId: document.scheduleTaskId,
                    quantity: line.quantity, session,
                });
            }
        }
    } else if (meta.class === 'TRANSFER') {
        for (const line of document.lines) {
            const result = await postTransfer(tx, {
                materialId: line.materialId,
                sourceWarehouseId: document.warehouseId, targetWarehouseId: document.targetWarehouseId,
                sourceLocationId: line.locationId, targetLocationId: line.targetLocationId,
                quantity: line.quantity, documentId: document.id,
                sourceLineId: line.id, targetLineId: line.id, session, allowNegative,
            });
            await tx.invDocumentLine.update({ where: { id: line.id }, data: { avgCostAtPosting: result.out.unitCostAtPosting } });
        }
    } else if (meta.class === 'RESERVE') {
        for (const line of document.lines) {
            await activateReservation(tx, {
                materialId: line.materialId, warehouseId: document.warehouseId,
                projectId: document.projectId, mfgOrderId: document.mfgOrderId, scheduleTaskId: document.scheduleTaskId,
                documentId: document.id, quantity: line.quantity, session,
            });
        }
    } else if (meta.class === 'RELEASE') {
        for (const line of document.lines) {
            let remaining = Number(line.quantity);
            const candidates = await tx.invStockReservation.findMany({
                where: {
                    materialId: line.materialId, warehouseId: document.warehouseId, status: 'ACTIVE',
                    OR: [
                        ...(document.projectId ? [{ projectId: document.projectId }] : []),
                        ...(document.mfgOrderId ? [{ mfgOrderId: document.mfgOrderId }] : []),
                        ...(document.scheduleTaskId ? [{ scheduleTaskId: document.scheduleTaskId }] : []),
                    ],
                },
                orderBy: { reservedAt: 'asc' },
            });
            for (const r of candidates) {
                if (remaining <= 0) break;
                if (Number(r.quantity) <= remaining) {
                    await deactivateReservation(tx, { reservationId: r.id, status: 'RELEASED', session, note: `Hủy giữ qua phiếu ${document.code}` });
                    remaining -= Number(r.quantity);
                }
            }
        }
    }
}
