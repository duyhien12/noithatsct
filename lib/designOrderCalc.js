// Công thức tính tiền Phiếu đặt hàng thiết kế nội thất — dùng chung frontend (xem trước)
// và backend (tính lại để tránh sai lệch dữ liệu, không tin số client gửi lên).

export function calcItemAmount(quantity, unitPrice) {
    return (Number(quantity) || 0) * (Number(unitPrice) || 0);
}

export function calcSubtotal(items) {
    return (items || []).reduce((sum, it) => sum + calcItemAmount(it.quantity, it.unitPrice), 0);
}

export function calcDiscountAmount(subtotal, discount, discountType) {
    const d = Number(discount) || 0;
    if (discountType === 'percent') return Math.min(subtotal, subtotal * d / 100);
    return Math.min(subtotal, d);
}

export function calcTotalAfterDiscount(subtotal, discount, discountType) {
    return Math.max(0, subtotal - calcDiscountAmount(subtotal, discount, discountType));
}

export function calcGrandTotal(totalAfterDiscount, vatRate) {
    return totalAfterDiscount * (1 + (Number(vatRate) || 0) / 100);
}

export function calcAll(items, discount, discountType, vatRate) {
    const subtotal = calcSubtotal(items);
    const totalAfterDiscount = calcTotalAfterDiscount(subtotal, discount, discountType);
    const grandTotal = calcGrandTotal(totalAfterDiscount, vatRate);
    return { subtotal, totalAfterDiscount, grandTotal };
}
