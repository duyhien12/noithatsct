// Nhân sự thiết kế kiến trúc — danh sách riêng, khác với DESIGNERS (nội thất) của CV Thiết kế.
export const ARCHITECTS = ['Đặng Bình Ngọc', 'Bùi Hải Đăng'];

// Hạng mục cột của Nhật ký tuần TKKT (/design-orders/lich-tkkt).
// noProject: ô nhập nội dung thay cho tên công trình; singleCol: một cột duy nhất (người nghỉ).
export const DESIGN_WORK_LOG_CATEGORIES = [
    { key: 'Khảo sát hiện trạng', label: 'Khảo sát hiện trạng', color: '#dbeafe', hd: '#93c5fd' },
];
export const DESIGN_WORK_LOG_CATEGORY_KEYS = DESIGN_WORK_LOG_CATEGORIES.map(c => c.key);
export const DESIGN_WORK_LOG_SHIFTS = ['Sáng', 'Chiều', 'Tối'];

// Gợi ý cho ô "Phòng ban yêu cầu" (theo bảng Department), vẫn cho gõ tự do.
export const REQUEST_DEPTS = ['Ban lãnh đạo', 'Phòng kinh doanh', 'Phòng xây dựng', 'Phòng thiết kế', 'Phòng hành chính kế toán', 'Marketing', 'Xưởng nội thất'];
