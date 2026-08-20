// Nhật ký Thu – Chi — nguồn chân lý duy nhất cho danh mục, trạng thái, và quy tắc phân quyền,
// dùng chung cho cả API routes và UI.

export const DEPARTMENTS = [
    'Kinh doanh',
    'Thiết kế kiến trúc',
    'Thiết kế nội thất',
    'Xây dựng',
    'Marketing',
    'Hành chính kế toán',
    'Quản lý chung',
    'Xưởng nội thất',
];

export const TRANSACTION_TYPES = ['Thu', 'Chi'];
export const PAYMENT_METHODS = ['Tiền mặt', 'Chuyển khoản'];
export const OBJECT_TYPES = ['Khách hàng', 'NCC', 'Thầu phụ', 'Nhân viên', 'Khác'];
export const STATUSES = ['Nháp', 'Đã duyệt', 'Đã hạch toán', 'Hủy'];

export const STATUS_COLORS = {
    'Nháp': { bg: '#F1F5F9', text: '#475569' },
    'Đã duyệt': { bg: '#DBEAFE', text: '#1E40AF' },
    'Đã hạch toán': { bg: '#D1FAE5', text: '#059669' },
    'Hủy': { bg: '#FEE2E2', text: '#DC2626' },
};

export const ALLOWED_TRANSITIONS = {
    'Nháp': ['Đã duyệt', 'Đã hạch toán', 'Hủy'],
    'Đã duyệt': ['Đã hạch toán', 'Hủy'],
    'Đã hạch toán': ['Hủy'],
    'Hủy': [],
};

// Chỉ giao dịch đã hạch toán mới ảnh hưởng số dư sổ sách / Dashboard.
export const BALANCE_STATUS = 'Đã hạch toán';

// Ghi chú: nhóm Thu/Chi chỉ mang tính hiển thị trong "Cài đặt danh mục" — dropdown
// "Chi tiết" khi tạo giao dịch hiển thị chung tất cả danh mục, không lọc theo Loại giao dịch.
export const DEFAULT_CATEGORIES = [
    // Thu
    { name: 'Vay ngắn hạn', group: 'Thu', order: 1 },
    { name: 'Thu khác', group: 'Thu', order: 2 },
    { name: 'Tiền gửi ngân hàng', group: 'Thu', order: 3 },
    { name: 'Phải thu khách hàng', group: 'Thu', order: 4 },
    { name: 'Lãi TK', group: 'Thu', order: 5 },
    { name: 'Doanh thu KDNT', group: 'Thu', order: 6 },
    { name: 'Doanh Thu TKNT', group: 'Thu', order: 7 },
    { name: 'Doanh thu TKKT', group: 'Thu', order: 8 },
    { name: 'Doanh thu XD', group: 'Thu', order: 9 },
    // Chi
    { name: 'BHXH', group: 'Chi', order: 1 },
    { name: 'Công đoàn', group: 'Chi', order: 2 },
    { name: 'Đối ngoại', group: 'Chi', order: 3 },
    { name: 'Xe oto', group: 'Chi', order: 4 },
    { name: 'Phúc lợi', group: 'Chi', order: 5 },
    { name: 'CP chung', group: 'Chi', order: 6 },
    { name: 'Nước SH', group: 'Chi', order: 7 },
    { name: 'Điện thoại', group: 'Chi', order: 8 },
    { name: 'Internet', group: 'Chi', order: 9 },
    { name: 'Sửa chữa', group: 'Chi', order: 10 },
    { name: 'Chi riêng', group: 'Chi', order: 11 },
    { name: 'Công tác', group: 'Chi', order: 12 },
    { name: 'NC thuê ngoài', group: 'Chi', order: 13 },
    { name: 'Xăng xe', group: 'Chi', order: 14 },
    { name: 'Vận chuyển', group: 'Chi', order: 15 },
    { name: 'Quảng cáo', group: 'Chi', order: 16 },
    { name: 'Điện sáng', group: 'Chi', order: 17 },
    { name: 'Lương', group: 'Chi', order: 18 },
    { name: 'Tiền ăn', group: 'Chi', order: 19 },
    { name: 'Tiếp khách', group: 'Chi', order: 20 },
    { name: 'Phần mềm', group: 'Chi', order: 21 },
    { name: 'Vật tư', group: 'Chi', order: 22 },
    { name: 'Sửa chữa MM', group: 'Chi', order: 23 },
    { name: 'Máy móc', group: 'Chi', order: 24 },
    { name: 'Lãi', group: 'Chi', order: 25 },
    { name: 'Thuế', group: 'Chi', order: 26 },
    { name: 'T/ứng VT+ ăn+ c/tác', group: 'Chi', order: 27 },
    { name: 'Trả NCC', group: 'Chi', order: 28 },
    { name: 'Chi khác', group: 'Chi', order: 29 },
    { name: 'T/ứng lương', group: 'Chi', order: 30 },
    { name: 'Sửa xe', group: 'Chi', order: 31 },
    { name: 'In hồ sơ', group: 'Chi', order: 32 },
    { name: 'Công cụ dụng cụ', group: 'Chi', order: 33 },
    { name: 'Phụ cấp', group: 'Chi', order: 34 },
    { name: 'Ứng lương SP', group: 'Chi', order: 35 },
    { name: 'Hàng hóa', group: 'Chi', order: 36 },
    { name: 'Đồng phục', group: 'Chi', order: 37 },
    { name: 'Gửi HĐ', group: 'Chi', order: 38 },
    { name: 'Lương SP', group: 'Chi', order: 39 },
    { name: 'Cho vay nội bộ', group: 'Chi', order: 40 },
    { name: 'Thưởng năng suất', group: 'Chi', order: 41 },
    { name: 'Thuê nhà', group: 'Chi', order: 42 },
    { name: 'Tổ chức sự kiện', group: 'Chi', order: 43 },
    { name: 'Chi A', group: 'Chi', order: 44 },
    { name: 'Bảo dưỡng', group: 'Chi', order: 45 },
    { name: 'Thu phí TK', group: 'Chi', order: 46 },
    { name: 'Chuyển quỹ', group: 'Chi', order: 47 },
    { name: 'Quà tặng', group: 'Chi', order: 48 },
    { name: 'Chiết khấu', group: 'Chi', order: 49 },
    { name: 'Văn phòng phẩm', group: 'Chi', order: 50 },
    { name: 'Làm thêm giờ', group: 'Chi', order: 51 },
    { name: 'Chi phí công trình', group: 'Chi', order: 52 },
    { name: 'Gốc', group: 'Chi', order: 53 },
    { name: 'Đầu tư XNT', group: 'Chi', order: 54 },
    { name: 'Liên hoan', group: 'Chi', order: 55 },
    { name: 'Phí thẩm định', group: 'Chi', order: 56 },
];

export const DEFAULT_ACCOUNTS = [
    { code: '111', name: 'Tiền mặt', order: 1 },
    { code: '111.1', name: 'Quỹ TM Lan', order: 2 },
    { code: '111.2', name: 'Quỹ TM Quỳnh', order: 3 },
    { code: '112', name: 'Tiền gửi ngân hàng', order: 4 },
    { code: '131', name: 'Phải thu khách hàng', order: 5 },
    { code: '138', name: 'Phải thu khác', order: 6 },
    { code: '141', name: 'Tạm ứng', order: 7 },
    { code: '331', name: 'Phải trả người bán', order: 8 },
    { code: '334', name: 'Phải trả người lao động', order: 9 },
    { code: '338', name: 'Phải trả, phải nộp khác', order: 10 },
    { code: '511', name: 'Doanh thu', order: 11 },
    { code: '621', name: 'Chi phí nguyên vật liệu trực tiếp', order: 12 },
    { code: '622', name: 'Chi phí nhân công trực tiếp', order: 13 },
    { code: '627', name: 'Chi phí sản xuất chung', order: 14 },
    { code: '641', name: 'Chi phí bán hàng', order: 15 },
    { code: '642', name: 'Chi phí quản lý doanh nghiệp', order: 16 },
    { code: '811', name: 'Chi phí khác', order: 17 },
];

// ── Phân quyền ──────────────────────────────────────────────────────────────
// Kế toán (ke_toan, hanh_chinh_kt): xem/thêm/sửa (giao dịch của mình hoặc chưa hạch toán)/
//   upload chứng từ/hạch toán/hủy. Không hard-delete giao dịch đã hạch toán.
// Ban Giám đốc / Kế toán trưởng (ban_gd, giam_doc, pho_gd): toàn quyền, kể cả sửa/hủy giao dịch
//   đã hạch toán.
// viewer: chỉ xem (withAuth đã chặn ghi toàn cục cho role này).
export const ADMIN_ROLES = ['ban_gd', 'giam_doc', 'pho_gd'];
export const ACCOUNTANT_ROLES = ['ke_toan', 'hanh_chinh_kt'];
export const VIEW_ROLES = [...ADMIN_ROLES, ...ACCOUNTANT_ROLES, 'viewer'];
export const CREATE_ROLES = [...ADMIN_ROLES, ...ACCOUNTANT_ROLES];
export const SETTINGS_ROLES = [...ADMIN_ROLES, ...ACCOUNTANT_ROLES];

export function getFinancePermissions({ role } = {}) {
    const isAdmin = ADMIN_ROLES.includes(role);
    const isAccountant = ACCOUNTANT_ROLES.includes(role);
    return {
        isAdmin,
        isAccountant,
        canView: isAdmin || isAccountant || role === 'viewer',
        canCreate: isAdmin || isAccountant,
        canEditPosted: isAdmin, // sửa giao dịch đã "Đã hạch toán"
        canCancel: isAdmin || isAccountant,
        canHardDelete: isAdmin || isAccountant, // chỉ áp dụng cho status "Nháp" (check riêng ở route)
        canManageSettings: isAdmin || isAccountant,
        canImportExport: isAdmin || isAccountant,
    };
}

export function canEditTransaction(user, tx) {
    const perms = getFinancePermissions(user || {});
    if (!perms.canCreate) return false;
    if (tx?.status === 'Đã hạch toán' || tx?.status === 'Hủy') return perms.canEditPosted;
    return true;
}

export function canTransitionStatus(user, from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) return false;
    const perms = getFinancePermissions(user || {});
    if (to === 'Hủy') return perms.canCancel;
    if (from === 'Đã hạch toán') return perms.isAdmin;
    return perms.canCreate;
}

// mục 4 — quy tắc phân bổ Thu/Chi × Tiền mặt/Chuyển khoản → 4 cột TM/TGNH
export function deriveCashFields(type, method, amount) {
    const amt = Number(amount) || 0;
    const isCash = method === 'Tiền mặt';
    return {
        cashIn: type === 'Thu' && isCash ? amt : 0,
        cashOut: type === 'Chi' && isCash ? amt : 0,
        bankIn: type === 'Thu' && !isCash ? amt : 0,
        bankOut: type === 'Chi' && !isCash ? amt : 0,
    };
}
