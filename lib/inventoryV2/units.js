/**
 * Quy đổi đơn vị cho vật tư Kho 2.0.
 * Mỗi InvMaterial có 3 vai trò đơn vị: purchaseUnitId (đơn vị nhập),
 * stockUnitId (đơn vị tồn chuẩn — canonical), issueUnitId (đơn vị xuất),
 * cùng 2 tỉ lệ quy đổi purchaseToStockRatio / issueToStockRatio
 * (số lượng đơn-vị-tồn tương ứng với 1 đơn-vị-nhập / 1 đơn-vị-xuất).
 * Mọi số lượng PHẢI được quy đổi về đơn vị tồn chuẩn trước khi ghi sổ.
 */

/**
 * Trả về tỉ lệ quy đổi 1 đơn vị `unitId` sang đơn vị tồn chuẩn của material.
 * Ném lỗi nếu unitId không khớp bất kỳ vai trò nào đã khai báo cho material đó
 * (không đoán mò tỉ lệ — bắt buộc phải chọn đúng 1 trong 3 đơn vị đã khai báo).
 *
 * @param {{ stockUnitId: string, purchaseUnitId: string, issueUnitId: string, purchaseToStockRatio: number, issueToStockRatio: number }} material
 * @param {string} unitId
 * @returns {number}
 */
export function resolveConversionRatio(material, unitId) {
    if (unitId === material.stockUnitId) return 1;
    if (unitId === material.purchaseUnitId) return material.purchaseToStockRatio || 1;
    if (unitId === material.issueUnitId) return material.issueToStockRatio || 1;
    throw new Error('Đơn vị không hợp lệ cho vật tư này — chỉ được chọn đơn vị nhập/tồn/xuất đã khai báo');
}

/**
 * Quy đổi số lượng nhập tay (theo unitId bất kỳ trong 3 đơn vị đã khai báo)
 * sang số lượng chuẩn theo đơn vị tồn kho.
 */
export function toStockQuantity(material, enteredQuantity, unitId) {
    const ratio = resolveConversionRatio(material, unitId);
    return Number(enteredQuantity) * ratio;
}
