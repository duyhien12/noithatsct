// Trạng thái công việc thiết kế nội bộ (module "CV Thiết kế") — nhẹ, không qua duyệt giá,
// tách biệt hoàn toàn với luồng trạng thái của DesignOrder (Phiếu đặt hàng thiết kế).

export const STATUSES = [
    'Việc cần làm',
    'Đang triển khai',
    'Việc tạm dừng',
    'Hoàn thành',
];

export const STATUS_COLORS = {
    'Việc cần làm': { bg: '#FFE4E6', text: '#E11D48' },
    'Đang triển khai': { bg: '#FFEDD5', text: '#EA580C' },
    'Việc tạm dừng': { bg: '#F1F5F9', text: '#64748B' },
    'Hoàn thành': { bg: '#DBEAFE', text: '#2563EB' },
};

export const DONE_STATUSES = ['Hoàn thành'];

// Tiến độ hình dung (%) theo trạng thái — chỉ để tô % tổng quan trên bảng CV / Gantt, không phải số liệu chính xác.
export const STATUS_PROGRESS = {
    'Việc cần làm': 0,
    'Đang triển khai': 50,
    'Việc tạm dừng': 25,
    'Hoàn thành': 100,
};

// Danh sách nhân sự thiết kế cố định để chọn nhanh ở ô "Người thực hiện".
export const DESIGNERS = ['Phạm Thành Đông', 'Đào Lê Ngọc Mai', 'Nguyễn Thị Hương Lý'];

// Bảng màu gán cho từng người thực hiện — dùng chung cho avatar (CV Thiết kế) và thanh Gantt,
// để cùng 1 người luôn hiện cùng 1 màu ở mọi nơi trong module.
const EXECUTOR_PALETTE = [
    '#2563eb', '#7c3aed', '#059669', '#ea580c', '#db2777',
    '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#16a34a',
];

export function colorForExecutor(name) {
    if (!name || name === 'Chưa phân công') return '#6b7280';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return EXECUTOR_PALETTE[hash % EXECUTOR_PALETTE.length];
}

// Phòng thiết kế + cấp quản lý được tạo/sửa/xóa công việc; Kinh doanh & viewer chỉ xem.
export const VIEW_ROLES = ['thiet_ke', 'kinh_doanh', 'ban_gd', 'giam_doc', 'pho_gd', 'admin', 'viewer'];
export const MANAGE_ROLES = ['thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin'];
