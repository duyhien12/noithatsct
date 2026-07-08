// Trạng thái xử lý Phiếu đặt hàng thiết kế nội thất — nguồn chân lý duy nhất,
// dùng chung cho cả API routes và UI.

export const STATUSES = [
    'Nháp',
    'Đã gửi thiết kế',
    'Phòng thiết kế đã tiếp nhận',
    'Đang thiết kế',
    'Chờ bổ sung thông tin',
    'Hoàn thành',
    'Hủy',
];

export const STATUS_COLORS = {
    'Nháp': { bg: '#F1F5F9', text: '#64748B' },
    'Đã gửi thiết kế': { bg: '#FFF7ED', text: '#EA580C' },
    'Phòng thiết kế đã tiếp nhận': { bg: '#EFF6FF', text: '#2563EB' },
    'Đang thiết kế': { bg: '#EDE9FE', text: '#7C3AED' },
    'Chờ bổ sung thông tin': { bg: '#FEF3C7', text: '#D97706' },
    'Hoàn thành': { bg: '#D1FAE5', text: '#059669' },
    'Hủy': { bg: '#FEE2E2', text: '#DC2626' },
};

export const ALLOWED_TRANSITIONS = {
    'Nháp': ['Đã gửi thiết kế', 'Hủy'],
    'Đã gửi thiết kế': ['Phòng thiết kế đã tiếp nhận', 'Chờ bổ sung thông tin', 'Hủy'],
    'Phòng thiết kế đã tiếp nhận': ['Đang thiết kế', 'Chờ bổ sung thông tin', 'Hủy'],
    'Đang thiết kế': ['Chờ bổ sung thông tin', 'Hoàn thành', 'Hủy'],
    'Chờ bổ sung thông tin': ['Đã gửi thiết kế', 'Nháp', 'Hủy'],
    'Hoàn thành': [],
    'Hủy': [],
};

// Các bước do phía Kinh doanh thực hiện
const SALES_TRANSITIONS = new Set([
    'Nháp>Đã gửi thiết kế',
    'Nháp>Hủy',
    'Chờ bổ sung thông tin>Đã gửi thiết kế',
    'Chờ bổ sung thông tin>Nháp',
]);

// Vai trò cấp quản lý toàn quyền (không có role con "Trưởng phòng" riêng trong hệ thống)
export const BAN_GD = ['ban_gd', 'giam_doc', 'pho_gd'];
export const MANAGE_ALL_ROLES = [...BAN_GD, 'admin'];

export const EDITABLE_STATUSES = ['Nháp', 'Chờ bổ sung thông tin'];

export function canEditDraft(role, status) {
    if (!EDITABLE_STATUSES.includes(status)) return false;
    return role === 'kinh_doanh' || MANAGE_ALL_ROLES.includes(role);
}

export function canTransition(role, from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) return false;
    if (MANAGE_ALL_ROLES.includes(role)) return true;
    if (to === 'Hủy') return role === 'kinh_doanh' || role === 'thiet_ke';
    const isSalesStep = SALES_TRANSITIONS.has(`${from}>${to}`);
    return isSalesStep ? role === 'kinh_doanh' : role === 'thiet_ke';
}

export function canAssignDesigner(role) {
    return role === 'thiet_ke' || MANAGE_ALL_ROLES.includes(role);
}

export function canManageSales(role) {
    return role === 'kinh_doanh' || MANAGE_ALL_ROLES.includes(role);
}
