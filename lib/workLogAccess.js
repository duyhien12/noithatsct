/**
 * Tài khoản ngoài phòng Xưởng được XEM (chỉ đọc) Nhật ký thi công xưởng nội thất (/workshop/work-log).
 * Thêm email vào đây khi cần cấp quyền xem cho người khác.
 */
export const WORK_LOG_VIEWER_EMAILS = ['ngocquynh@kientrucsct.com'];

export const isWorkLogViewer = (email) => WORK_LOG_VIEWER_EMAILS.includes(email || '');
