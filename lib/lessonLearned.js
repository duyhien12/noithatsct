// Bài học dự án (Lessons Learned) — nguồn chân lý duy nhất cho danh mục, trạng thái,
// và quy tắc phân quyền, dùng chung cho cả API routes và UI.

export const CATEGORIES = [
    'Khảo sát',
    'Thiết kế',
    'Báo giá',
    'Ký hợp đồng',
    'Đặt hàng',
    'Sản xuất',
    'Lắp đặt',
    'Nghiệm thu',
    'Bảo hành',
    'Khác',
];

export const SEVERITIES = ['Thấp', 'Trung bình', 'Cao', 'Nghiêm trọng'];

export const SEVERITY_COLORS = {
    'Thấp': { bg: '#D1FAE5', text: '#059669' },
    'Trung bình': { bg: '#FEF3C7', text: '#D97706' },
    'Cao': { bg: '#FFEDD5', text: '#EA580C' },
    'Nghiêm trọng': { bg: '#FEE2E2', text: '#DC2626' },
};

export const STATUSES = ['Đang xử lý', 'Đã xử lý', 'Đã cập nhật quy trình'];

export const STATUS_COLORS = {
    'Đang xử lý': { bg: '#FFF7ED', text: '#EA580C' },
    'Đã xử lý': { bg: '#EFF6FF', text: '#2563EB' },
    'Đã cập nhật quy trình': { bg: '#D1FAE5', text: '#059669' },
};

export const ALLOWED_TRANSITIONS = {
    'Đang xử lý': ['Đã xử lý'],
    'Đã xử lý': ['Đã cập nhật quy trình', 'Đang xử lý'],
    'Đã cập nhật quy trình': [],
};

// ── Phân quyền ──────────────────────────────────────────────────────────────
// Admin / Ban giám đốc: toàn quyền.
// Trưởng phòng (kinh_doanh + chức danh quản lý): thêm, sửa (mọi bài), duyệt/chuyển trạng thái.
// Nhân viên (kinh_doanh): thêm mới, xem, sửa bài của chính mình.
export const ADMIN_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];
export const MANAGER_TITLES = ['Trưởng phòng', 'Phó phòng', 'Quản lý'];
export const VIEW_ROLES = ['kinh_doanh', ...ADMIN_ROLES, 'viewer'];
export const CREATE_ROLES = ['kinh_doanh', ...ADMIN_ROLES];

export function getLessonPermissions({ role, department } = {}) {
    const isAdmin = ADMIN_ROLES.includes(role);
    const isManager = role === 'kinh_doanh' && MANAGER_TITLES.includes(department);
    const isStaff = role === 'kinh_doanh';
    return {
        isAdmin,
        isManager,
        canView: isAdmin || isStaff || role === 'viewer',
        canCreate: isAdmin || isStaff,
        canEditAny: isAdmin || isManager,
        canConfirm: isAdmin || isManager,
        canDelete: isAdmin || isManager,
        canExport: isAdmin || isStaff,
    };
}

export function canEditLesson(user, lesson) {
    const perms = getLessonPermissions(user || {});
    if (perms.canEditAny) return true;
    if (!perms.canCreate) return false;
    return !!lesson && (lesson.createdById === user?.id || (!lesson.createdById && lesson.createdBy === user?.name));
}

export function canTransitionStatus(user, from, to) {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) return false;
    return getLessonPermissions(user || {}).canConfirm;
}
