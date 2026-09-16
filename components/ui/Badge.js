'use client';

/**
 * Badge trạng thái dùng chung.
 *
 * Quy ước màu (một trạng thái chỉ có MỘT màu trên toàn hệ thống):
 *   neutral — Nháp, Khảo sát, Lưu trữ
 *   warning — Chờ xử lý, Chờ duyệt, Đang xử lý
 *   info    — Đang thực hiện, Đang thi công
 *   success — Hoàn thành, Đã duyệt, Đã thu
 *   danger  — Quá hạn, Từ chối, Hủy
 *   purple  — Thiết kế, Bảo hành
 */
export const TONES = ['neutral', 'warning', 'info', 'success', 'danger', 'purple', 'primary'];

/** Bản đồ trạng thái → tone. Key viết thường, bỏ dấu cách thừa. */
const STATUS_TONES = {
    // --- Nháp / khởi tạo ---
    'nháp': 'neutral',
    'mới': 'neutral',
    'khảo sát': 'neutral',
    'lưu trữ': 'neutral',
    'tạm dừng': 'neutral',
    'chưa bắt đầu': 'neutral',
    'lead': 'info',

    // --- Chờ ---
    'chờ xử lý': 'warning',
    'chờ duyệt': 'warning',
    'chờ thanh toán': 'warning',
    'chuẩn bị thi công': 'warning',
    'đang xử lý': 'warning',
    'thu một phần': 'warning',
    'trung bình': 'warning',

    // --- Đang chạy ---
    'đang thực hiện': 'info',
    'đang thi công': 'info',
    'thi công': 'info',
    'đang giao': 'info',
    'đã ký': 'info',
    'ký hợp đồng': 'info',
    'báo giá': 'info',

    // --- Xong ---
    'hoàn thành': 'success',
    'đã duyệt': 'success',
    'đã thu': 'success',
    'đã thanh toán': 'success',
    'đã giao': 'success',
    'đã nghiệm thu': 'success',
    'thấp': 'success',

    // --- Xấu ---
    'quá hạn': 'danger',
    'chưa thu': 'danger',
    'từ chối': 'danger',
    'hủy': 'danger',
    'đã hủy': 'danger',
    'ngừng': 'danger',
    'dừng': 'danger',
    'cao': 'danger',
    'khẩn cấp': 'danger',

    // --- Chuyên môn ---
    'thiết kế': 'purple',
    'bảo hành': 'purple',
};

/** Trả về tone tương ứng với chuỗi trạng thái. */
export function toneOf(status, fallback = 'neutral') {
    if (!status) return fallback;
    const key = String(status).trim().toLowerCase();
    return STATUS_TONES[key] || fallback;
}

export default function Badge({ tone, status, children, dot = false, size, className = '', ...rest }) {
    const resolved = tone || toneOf(status);
    const classes = [
        'ui-badge',
        `ui-badge--${resolved}`,
        size === 'sm' ? 'ui-badge--sm' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <span className={classes} {...rest}>
            {dot && <span className="ui-badge__dot" aria-hidden="true" />}
            {children ?? status}
        </span>
    );
}
