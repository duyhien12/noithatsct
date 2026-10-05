// Trạng thái xử lý Phiếu đặt hàng thiết kế nội thất — nguồn chân lý duy nhất,
// dùng chung cho cả API routes và UI.

export const STATUSES = [
    'Nháp',
    'Đã gửi thiết kế',
    'Phòng thiết kế đã tiếp nhận',
    'Đang thiết kế',
    'Chờ bổ sung thông tin',
    'Chờ nghiệm thu',
    'Hoàn thành',
    'Hủy',
];

export const STATUS_COLORS = {
    'Nháp': { bg: '#F1F5F9', text: '#64748B' },
    'Đã gửi thiết kế': { bg: '#FFF7ED', text: '#EA580C' },
    'Phòng thiết kế đã tiếp nhận': { bg: '#EFF6FF', text: '#2563EB' },
    'Đang thiết kế': { bg: '#EDE9FE', text: '#7C3AED' },
    'Chờ bổ sung thông tin': { bg: '#FEF3C7', text: '#D97706' },
    'Chờ nghiệm thu': { bg: '#CFFAFE', text: '#0E7490' },
    'Hoàn thành': { bg: '#D1FAE5', text: '#059669' },
    'Hủy': { bg: '#FEE2E2', text: '#DC2626' },
};

export const ALLOWED_TRANSITIONS = {
    'Nháp': ['Đã gửi thiết kế', 'Hủy'],
    'Đã gửi thiết kế': ['Phòng thiết kế đã tiếp nhận', 'Chờ bổ sung thông tin', 'Hủy'],
    'Phòng thiết kế đã tiếp nhận': ['Đang thiết kế', 'Chờ bổ sung thông tin', 'Hủy'],
    'Đang thiết kế': ['Chờ nghiệm thu', 'Chờ bổ sung thông tin', 'Hủy'],
    'Chờ bổ sung thông tin': ['Đã gửi thiết kế', 'Nháp', 'Hủy'],
    'Chờ nghiệm thu': ['Hoàn thành', 'Đang thiết kế', 'Hủy'],
    // Mở lại phiếu đã nghiệm thu — chỉ Ban GĐ, doanh số đã chốt sẽ bị hủy để tính lại
    'Hoàn thành': ['Chờ nghiệm thu', 'Đang thiết kế', 'Chờ bổ sung thông tin'],
    'Hủy': [],
};

// Các bước do phía Kinh doanh thực hiện
const SALES_TRANSITIONS = new Set([
    'Nháp>Đã gửi thiết kế',
    'Nháp>Hủy',
    'Chờ bổ sung thông tin>Đã gửi thiết kế',
    'Chờ bổ sung thông tin>Nháp',
    'Chờ nghiệm thu>Hoàn thành',
    'Chờ nghiệm thu>Đang thiết kế',
]);

// Nhãn nút bấm cho từng bước (mặc định dùng tên trạng thái đích)
export const TRANSITION_LABELS = {
    'Nháp>Đã gửi thiết kế': 'Gửi phòng thiết kế',
    'Đã gửi thiết kế>Phòng thiết kế đã tiếp nhận': 'Xác nhận đơn hàng',
    'Đã gửi thiết kế>Chờ bổ sung thông tin': 'Trả lại, yêu cầu bổ sung',
    'Phòng thiết kế đã tiếp nhận>Đang thiết kế': 'Bắt đầu thiết kế',
    'Đang thiết kế>Chờ nghiệm thu': 'Bàn giao, chờ nghiệm thu',
    'Chờ bổ sung thông tin>Đã gửi thiết kế': 'Gửi lại phòng thiết kế',
    'Chờ nghiệm thu>Hoàn thành': 'Nghiệm thu đạt',
    'Chờ nghiệm thu>Đang thiết kế': 'Yêu cầu chỉnh sửa',
    'Hoàn thành>Chờ nghiệm thu': 'Mở lại: về Chờ nghiệm thu',
    'Hoàn thành>Đang thiết kế': 'Mở lại: về Đang thiết kế',
    'Hoàn thành>Chờ bổ sung thông tin': 'Mở lại: về KD sửa phiếu',
};

// Các bước bắt buộc nhập ghi chú / lý do
export const NOTE_REQUIRED = new Set([
    'Đã gửi thiết kế>Chờ bổ sung thông tin',
    'Phòng thiết kế đã tiếp nhận>Chờ bổ sung thông tin',
    'Đang thiết kế>Chờ bổ sung thông tin',
    'Chờ nghiệm thu>Đang thiết kế',
    'Hoàn thành>Chờ nghiệm thu',
    'Hoàn thành>Đang thiết kế',
    'Hoàn thành>Chờ bổ sung thông tin',
]);

export function transitionLabel(from, to) {
    return TRANSITION_LABELS[`${from}>${to}`] || to;
}

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
    if (from === 'Hoàn thành') return false;
    if (to === 'Hủy') return role === 'kinh_doanh' || role === 'thiet_ke';
    const isSalesStep = SALES_TRANSITIONS.has(`${from}>${to}`);
    return isSalesStep ? role === 'kinh_doanh' : role === 'thiet_ke';
}

export function canAssignDesigner(role) {
    return role === 'thiet_ke' || MANAGE_ALL_ROLES.includes(role);
}

// Phân công/chia % chỉ sửa được khi phiếu đã gửi TK và chưa chốt doanh số
export const ASSIGNABLE_STATUSES = ['Đã gửi thiết kế', 'Phòng thiết kế đã tiếp nhận', 'Đang thiết kế', 'Chờ bổ sung thông tin', 'Chờ nghiệm thu'];

// Tháng ghi nhận doanh số theo giờ Việt Nam, dạng "YYYY-MM"
export function revenueMonthOf(date) {
    const vn = new Date(new Date(date).getTime() + 7 * 3600 * 1000);
    return vn.toISOString().slice(0, 7);
}

// Chia doanh số theo %, dồn phần lẻ làm tròn vào người cuối để tổng khớp tuyệt đối
export function splitRevenue(total, designers) {
    let remaining = Math.round(total);
    return designers.map((d, i) => {
        const amount = i === designers.length - 1 ? remaining : Math.round(total * d.sharePercent / 100);
        remaining -= amount;
        return { ...d, amount };
    });
}

export function canManageSales(role) {
    return role === 'kinh_doanh' || MANAGE_ALL_ROLES.includes(role);
}

// Nhập đơn giá tính doanh số trên trang Doanh số thiết kế
export function canEditPricing(role) {
    return role === 'thiet_ke' || canManageSales(role);
}
