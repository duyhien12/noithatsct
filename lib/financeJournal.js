// Nhật ký Thu – Chi — nguồn chân lý duy nhất cho danh mục, trạng thái, và quy tắc phân quyền,
// dùng chung cho cả API routes và UI.

export const DEPARTMENTS = [
    'Kinh doanh',
    'Thiết kế',
    'Xây dựng',
    'Xưởng',
    'Hành chính – Kế toán',
    'Khác',
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

export const DEFAULT_CATEGORIES = [
    // Thu
    { name: 'Thu khách hàng', group: 'Thu', order: 1 },
    { name: 'Thu công nợ', group: 'Thu', order: 2 },
    { name: 'Thu tạm ứng hoàn lại', group: 'Thu', order: 3 },
    { name: 'Thu hoàn ứng', group: 'Thu', order: 4 },
    { name: 'Thu khác', group: 'Thu', order: 5 },
    // Chi
    { name: 'Mua vật tư', group: 'Chi', order: 1 },
    { name: 'Mua hàng hóa', group: 'Chi', order: 2 },
    { name: 'Chi nhà cung cấp', group: 'Chi', order: 3 },
    { name: 'Chi thầu phụ', group: 'Chi', order: 4 },
    { name: 'Chi nhân công', group: 'Chi', order: 5 },
    { name: 'Chi lương', group: 'Chi', order: 6 },
    { name: 'Chi vận chuyển', group: 'Chi', order: 7 },
    { name: 'Chi văn phòng', group: 'Chi', order: 8 },
    { name: 'Chi tiếp khách', group: 'Chi', order: 9 },
    { name: 'Chi marketing', group: 'Chi', order: 10 },
    { name: 'Chi công trình', group: 'Chi', order: 11 },
    { name: 'Chi xưởng', group: 'Chi', order: 12 },
    { name: 'Chi tạm ứng', group: 'Chi', order: 13 },
    { name: 'Chi hoàn ứng', group: 'Chi', order: 14 },
    { name: 'Chi phí cố định', group: 'Chi', order: 15 },
    { name: 'Chi khác', group: 'Chi', order: 16 },
];

export const DEFAULT_ACCOUNTS = [
    { code: '111', name: 'Tiền mặt', order: 1 },
    { code: '112', name: 'Tiền gửi ngân hàng', order: 2 },
    { code: '131', name: 'Phải thu khách hàng', order: 3 },
    { code: '138', name: 'Phải thu khác', order: 4 },
    { code: '141', name: 'Tạm ứng', order: 5 },
    { code: '331', name: 'Phải trả người bán', order: 6 },
    { code: '334', name: 'Phải trả người lao động', order: 7 },
    { code: '338', name: 'Phải trả, phải nộp khác', order: 8 },
    { code: '511', name: 'Doanh thu', order: 9 },
    { code: '621', name: 'Chi phí nguyên vật liệu trực tiếp', order: 10 },
    { code: '622', name: 'Chi phí nhân công trực tiếp', order: 11 },
    { code: '627', name: 'Chi phí sản xuất chung', order: 12 },
    { code: '641', name: 'Chi phí bán hàng', order: 13 },
    { code: '642', name: 'Chi phí quản lý doanh nghiệp', order: 14 },
    { code: '811', name: 'Chi phí khác', order: 15 },
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
