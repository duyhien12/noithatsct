/**
 * Nhân sự ngoài vai trò Thiết kế (thiet_ke) nhưng vẫn được phân công làm Phiếu đặt hàng thiết kế
 * và nhận chia % doanh số. Giữ nguyên vai trò/menu gốc của họ.
 * Thêm email vào đây khi cần.
 */
export const EXTRA_DESIGNER_EMAILS = ['haidang@kientrucsct.com'];

export const isDesignStaff = (user) =>
    user?.role === 'thiet_ke' || EXTRA_DESIGNER_EMAILS.includes(user?.email || '');
