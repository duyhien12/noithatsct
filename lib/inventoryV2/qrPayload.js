/**
 * Nội dung QR cho vật tư Kho 2.0 — trỏ về trang chi tiết vật tư trong app
 * (yêu cầu đăng nhập mới xem được, giống mẫu manufacturing/work-order QR),
 * không nhúng token/dữ liệu nhạy cảm vào QR.
 */
export function materialQrUrl(baseUrl, materialId) {
    return `${baseUrl}/inventory-v2/materials/${materialId}`;
}
