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

// Ghi chú: dropdown "Chi tiết" khi tạo giao dịch lọc theo group ("Thu"/"Chi") khớp với
// Loại giao dịch đang chọn — đổi Loại giao dịch thì phải chọn lại Chi tiết.
//
// Danh mục là cây tối đa 3 cấp (FinanceCategory.parentId/level): Nhóm cấp 1 → cấp 2 → cấp 3.
// DEFAULT_CATEGORY_GROUPS chỉ seed sẵn 2 cấp (nhóm cấp 1 + các mục chi tiết hiện có làm cấp 2);
// cấp 3 (vd: loại vật tư cụ thể) kế toán tự thêm qua modal "Cài đặt danh mục" khi cần, không cần sửa code.
// Bản sao CommonJS của cấu trúc này nằm ở prisma/seed-finance.js (script seed chạy bằng node thuần,
// không qua Next.js nên không import được module ESM này).
export const DEFAULT_CATEGORY_GROUPS = [
    { name: 'Thu khách hàng / Doanh thu', group: 'Thu', order: 1, items: ['Doanh thu KDNT', 'Doanh Thu TKNT', 'Doanh thu TKKT', 'Doanh thu XD', 'Phải thu khách hàng'] },
    { name: 'Thu tài chính', group: 'Thu', order: 2, items: ['Vay ngắn hạn', 'Lãi TK', 'Tiền gửi ngân hàng'] },
    { name: 'Thu khác', group: 'Thu', order: 3, items: [] }, // đơn lẻ — bản thân nó là mục cấp 1 luôn, không cần bọc thêm cấp 2

    { name: 'Chi phí công trình', group: 'Chi', order: 1, items: ['Vật tư', 'NC thuê ngoài', 'Vận chuyển', 'Máy móc', 'Sửa chữa MM', 'Công cụ dụng cụ', 'Hàng hóa', 'Chi phí công trình khác', 'Đầu tư XNT'] },
    { name: 'Chi phí nhân sự', group: 'Chi', order: 2, items: ['Lương', 'Lương SP', 'Ứng lương SP', 'T/ứng lương', 'BHXH', 'Công đoàn', 'Phụ cấp', 'Thưởng năng suất', 'Làm thêm giờ', 'Tiền ăn', 'Đồng phục', 'Phúc lợi'] },
    { name: 'Chi phí quản lý & vận hành', group: 'Chi', order: 3, items: ['CP chung', 'Nước SH', 'Điện thoại', 'Internet', 'Điện sáng', 'Văn phòng phẩm', 'In hồ sơ', 'Thuê nhà', 'Bảo dưỡng', 'Phần mềm', 'Sửa chữa'] },
    { name: 'Chi phí bán hàng & marketing', group: 'Chi', order: 4, items: ['Quảng cáo', 'Đối ngoại', 'Tiếp khách', 'Tổ chức sự kiện', 'Quà tặng', 'Chiết khấu', 'Gửi HĐ'] },
    { name: 'Chi phí đi lại & xe', group: 'Chi', order: 5, items: ['Xe oto', 'Xăng xe', 'Sửa xe', 'Công tác'] },
    { name: 'Chi phí tài chính', group: 'Chi', order: 6, items: ['Lãi', 'Gốc', 'Thuế', 'Thu phí TK', 'Phí thẩm định'] },
    { name: 'Tạm ứng & công nợ nội bộ', group: 'Chi', order: 7, items: ['T/ứng VT+ ăn+ c/tác', 'Trả NCC', 'Cho vay nội bộ', 'Chuyển quỹ'] },
    { name: 'Chi khác', group: 'Chi', order: 8, items: ['Chi khác (chưa phân loại)', 'Chi riêng', 'Chi A', 'Liên hoan'] },
];

// ── Cây danh mục ────────────────────────────────────────────────────────────
// categories: mảng phẳng FinanceCategory { id, name, parentId, level, order, ... }
export function buildCategoryTree(categories) {
    const byParent = new Map();
    for (const c of categories) {
        const key = c.parentId || '__root__';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(c);
    }
    const sortFn = (a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, 'vi');
    const attach = (node) => {
        const children = (byParent.get(node.id) || []).sort(sortFn);
        return { ...node, children: children.map(attach) };
    };
    return (byParent.get('__root__') || []).sort(sortFn).map(attach);
}

// Danh sách id của chính nó + toàn bộ hậu duệ — dùng để lọc giao dịch theo nhóm cha
export function getCategoryDescendantIds(categoryId, categories) {
    const ids = new Set([categoryId]);
    let added = true;
    while (added) {
        added = false;
        for (const c of categories) {
            if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) { ids.add(c.id); added = true; }
        }
    }
    return [...ids];
}

// Đường dẫn từ gốc đến chính nó — dùng để set giá trị các dropdown cấp 1/2/3 khi sửa/xem
export function getCategoryPath(categoryId, categories) {
    const byId = new Map(categories.map(c => [c.id, c]));
    const path = [];
    let cur = byId.get(categoryId);
    while (cur) { path.unshift(cur); cur = cur.parentId ? byId.get(cur.parentId) : null; }
    return path;
}

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
