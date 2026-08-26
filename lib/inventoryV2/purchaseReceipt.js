import prisma from '@/lib/prisma';
import { withDailyCodeRetry } from '@/lib/generateCode';
import { postLedgerEntry } from './costing';
import { writeInvAudit } from './audit';

/**
 * Cầu nối 1 chiều: Nhận hàng PO (Mua sắm vật tư) vào kho công ty → nếu vật tư đó đã được khai
 * báo trong Kho vật tư 2.0 (InvMaterial.legacyProductId khớp productId) thì tự lập + duyệt luôn
 * 1 phiếu Nhập mua (IMPORT_PURCHASE), bỏ qua bước Nháp/Chờ duyệt vì đây là ghi nhận tự động theo
 * nghiệp vụ đã xảy ra thật (hàng đã về), không cần duyệt lại — giống cách legacyMigration.js tạo
 * phiếu "Nhập tồn đầu kỳ" thẳng ở trạng thái APPROVED.
 *
 * Vật tư CHƯA khai báo trong Kho 2.0 thì bỏ qua lặng lẽ (trả về null) — hệ cũ (Product.stock)
 * vẫn là nguồn tồn kho cho tới khi vật tư đó được khai báo bên Kho vật tư 2.0.
 */
export async function postPurchaseReceiptToInvV2({ productId, quantity, unitPrice, po, session }) {
    if (!productId || !(Number(quantity) > 0)) return null;

    const material = await prisma.invMaterial.findFirst({ where: { legacyProductId: productId, deletedAt: null } });
    if (!material) return null;

    const warehouseId = material.defaultWarehouseId
        || (await prisma.invWarehouse.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } }))?.id;
    if (!warehouseId) return null;

    const qty = Number(quantity);
    const unitCost = Number(unitPrice) || 0;

    return withDailyCodeRetry('invDocument', 'PNK', (code) => prisma.$transaction(async (tx) => {
        const doc = await tx.invDocument.create({
            data: {
                code, docType: 'IMPORT_PURCHASE', direction: 'IN', status: 'APPROVED',
                warehouseId, supplierId: po.supplierId || null, projectId: po.projectId || null,
                notes: `Tự động ghi nhận từ Nhận hàng PO ${po.code} — ${po.supplier}`,
                totalAmount: qty * unitCost,
                createdById: session?.user?.id || '', approvedById: session?.user?.id || '', approvedAt: new Date(),
            },
        });
        const line = await tx.invDocumentLine.create({
            data: {
                documentId: doc.id, materialId: material.id,
                enteredQuantity: qty, enteredUnitId: material.stockUnitId, ratioToStockUsed: 1,
                quantity: qty, unitPrice: unitCost, amount: qty * unitCost,
            },
        });
        const result = await postLedgerEntry(tx, {
            materialId: material.id, warehouseId, direction: 'IN', quantity: qty, unitCost,
            documentId: doc.id, documentLineId: line.id, session, note: `Nhận hàng PO ${po.code}`,
        });
        await tx.invDocumentLine.update({ where: { id: line.id }, data: { avgCostAtPosting: result.unitCostAtPosting } });
        await writeInvAudit(tx, {
            entityType: 'InvDocument', entityId: doc.id, action: 'AUTO_APPROVE_FROM_PO',
            toStatus: 'APPROVED', session, note: `Tự động từ Nhận hàng PO ${po.code}`,
        });
        return doc;
    }));
}
