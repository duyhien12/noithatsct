/**
 * Tài khoản ngoài phòng Xưởng được XEM (chỉ đọc) Nhật ký thi công xưởng nội thất (/workshop/work-log)
 * và Tổng hợp công theo công trình (/workshop/work-log/project-summary).
 * Thêm email vào đây khi cần cấp quyền xem cho người khác.
 */
export const WORK_LOG_VIEWER_EMAILS = ['ngocquynh@kientrucsct.com'];

export const isWorkLogViewer = (email) => WORK_LOG_VIEWER_EMAILS.includes(email || '');
