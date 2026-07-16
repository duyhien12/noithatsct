/**
 * Phân quyền module Quản lý sản xuất xưởng (Manufacturing).
 * Isomorphic: dùng được cả ở API route (session.user) lẫn client (useRole()).
 * Tái sử dụng role hệ thống hiện có ('xuong', 'ban_gd', ...) + field `department`
 * (đã có sẵn trên User) để phân biệt Quản đốc / QC / Tổ trưởng / Thợ — đúng cách
 * WorkshopSidebar đang phân biệt "Nhân viên xưởng" hiện tại, không tạo role mới.
 */

const BAN_GD = ['ban_gd', 'giam_doc', 'pho_gd'];
// Cấp quản lý xưởng — khớp đúng các giá trị department thực tế đang dùng trong DB
// ("Quản lý", "Phó phòng"), cộng thêm biến thể tên gọi khác có thể phát sinh sau này.
const XUONG_QUAN_DOC = ['Quản đốc', 'Quản lý', 'Trưởng phòng', 'Phó phòng'];
const XUONG_QC = ['QC'];
const XUONG_TO_TRUONG = ['Tổ trưởng'];
const XUONG_THO = ['Thợ chính', 'Thợ phụ', 'Nhân viên'];
const XUONG_KHO = ['Kho', 'Mua hàng'];
const SUPERVISOR_EMAILS = ['huuhung@kientrucsct.com'];

const ALL_PERMISSIONS = [
    'view', 'create', 'update', 'delete', 'approve', 'assign', 'start', 'complete',
    'view_cost', 'manage_material', 'qc', 'resolve_issue', 'pack', 'deliver', 'report',
];

/**
 * @param {{ role?: string, department?: string, email?: string }} user
 * @returns {Record<string, boolean>} production.<key> -> boolean
 */
export function getMfgPermissions(user) {
    const role = user?.role || '';
    const department = user?.department || '';
    const email = user?.email || '';
    const isSupervisor = SUPERVISOR_EMAILS.includes(email);

    const perms = Object.fromEntries(ALL_PERMISSIONS.map(k => [k, false]));

    if (BAN_GD.includes(role)) {
        // Ban giám đốc / admin: toàn quyền
        ALL_PERMISSIONS.forEach(k => { perms[k] = true; });
        return perms;
    }

    if (role === 'xuong') {
        // Xem báo cáo (không gồm chi phí — chi phí gate riêng bởi view_cost) mở cho toàn bộ nhân sự Xưởng
        perms.view = true;
        perms.report = true;
        if (XUONG_QUAN_DOC.includes(department)) {
            perms.create = true; perms.update = true; perms.assign = true;
            perms.start = true; perms.complete = true; perms.pack = true; perms.deliver = true;
            perms.manage_material = true;
        } else if (XUONG_QC.includes(department)) {
            perms.qc = true; perms.resolve_issue = true;
        } else if (XUONG_TO_TRUONG.includes(department)) {
            perms.assign = true; perms.start = true; perms.complete = true;
        } else if (XUONG_KHO.includes(department)) {
            perms.manage_material = true;
        } else if (XUONG_THO.includes(department)) {
            perms.start = true; perms.complete = true;
        } else {
            // department chưa gán cụ thể: coi như thợ, chỉ xem + tự cập nhật việc của mình
            perms.start = true; perms.complete = true;
        }
        return perms;
    }

    if (role === 'thiet_ke' || role === 'xay_dung') {
        perms.view = true; perms.create = true; perms.update = true;
        perms.manage_material = true;
        return perms;
    }

    if (role === 'hanh_chinh_kt' || role === 'ke_toan') {
        perms.view = true; perms.view_cost = true; perms.manage_material = true; perms.report = true;
        return perms;
    }

    if (role === 'kinh_doanh') {
        perms.view = true; perms.report = true;
        return perms;
    }

    if (isSupervisor) {
        // Giám sát nội thất: xem + xác nhận nhận hàng/lắp đặt + báo lỗi công trình
        perms.view = true; perms.resolve_issue = true; perms.report = true;
        return perms;
    }

    if (role === 'viewer') {
        perms.view = true;
        return perms;
    }

    // Mặc định (ky_thuat cũ, role không xác định): chỉ xem
    perms.view = true;
    return perms;
}

/**
 * Trả về true/false cho 1 permission cụ thể.
 * @param {object} user
 * @param {string} key - 1 trong ALL_PERMISSIONS
 */
export function hasMfgPermission(user, key) {
    return !!getMfgPermissions(user)[key];
}

/**
 * Dùng trong API route: throw Response 403 nếu không đủ quyền.
 * @param {object} session - session từ withAuth (session.user)
 * @param {string} key
 * @returns {Response|null} - trả về NextResponse lỗi nếu thiếu quyền, null nếu đủ quyền
 */
export function assertMfgPermission(session, key) {
    if (!hasMfgPermission(session?.user, key)) {
        return { error: 'Bạn không có quyền thực hiện thao tác này', status: 403 };
    }
    return null;
}

export { ALL_PERMISSIONS as MFG_PERMISSION_KEYS };
