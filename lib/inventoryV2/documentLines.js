import prisma from '@/lib/prisma';
import { resolveConversionRatio } from './units';

/**
 * Chuẩn hóa danh sách dòng vật tư nhập từ client (quy đổi đơn vị, tính amount)
 * dùng chung cho tạo mới và sửa phiếu (chỉ khi phiếu còn ở trạng thái Nháp).
 * Ném lỗi { status, error } (throw) nếu dữ liệu không hợp lệ.
 */
export async function buildDocumentLines(lineInputs) {
    const valid = Array.isArray(lineInputs) ? lineInputs.filter(l => l.materialId && Number(l.enteredQuantity) > 0) : [];
    if (valid.length === 0) {
        const err = new Error('Phiếu cần ít nhất 1 dòng vật tư hợp lệ (số lượng > 0)');
        err.status = 400;
        throw err;
    }

    const materials = await prisma.invMaterial.findMany({ where: { id: { in: valid.map(l => l.materialId) } } });
    const materialMap = new Map(materials.map(m => [m.id, m]));

    let totalAmount = 0;
    const linesData = [];
    for (const [i, l] of valid.entries()) {
        const material = materialMap.get(l.materialId);
        if (!material) { const err = new Error(`Không tìm thấy vật tư ${l.materialId}`); err.status = 400; throw err; }
        const unitId = l.enteredUnitId || material.stockUnitId;
        let ratio;
        try { ratio = resolveConversionRatio(material, unitId); }
        catch (e) { const err = new Error(`${material.sku}: ${e.message}`); err.status = 400; throw err; }

        const enteredQuantity = Number(l.enteredQuantity);
        const quantity = enteredQuantity * ratio;
        const unitPrice = Number(l.unitPrice) || 0;
        const amount = quantity * unitPrice;
        totalAmount += amount;

        linesData.push({
            lineNo: i, materialId: material.id, locationId: l.locationId || null, targetLocationId: l.targetLocationId || null,
            enteredQuantity, enteredUnitId: unitId, ratioToStockUsed: ratio, quantity, unitPrice, amount,
            remnantId: l.remnantId || null, note: l.note || '',
        });
    }

    return { linesData, totalAmount };
}
