/**
 * Phân quyền module Kho vật tư xưởng 2.0 (Inventory V2).
 * Isomorphic: dùng được cả ở API route (session.user) lẫn client.
 * Tái sử dụng role hệ thống hiện có ('xuong', 'ban_gd', 'hanh_chinh_kt', 'viewer', ...)
 * + field `department` (đã có sẵn trên User) — đúng mẫu lib/manufacturing/permissions.js,
 * dùng lại NGUYÊN các giá trị department đã được xác lập ở module sản xuất
 * ('Quản đốc', 'Kho', 'Tổ trưởng', ...) thay vì phát minh taxonomy mới.
 */

const BAN_GD = ['ban_gd', 'giam_doc', 'pho_gd'];
const KE_TOAN = ['hanh_chinh_kt', 'ke_toan'];
const XUONG_QUAN_DOC = ['Quản đốc', 'Quản lý', 'Trưởng phòng', 'Phó phòng'];
const XUONG_KHO = ['Kho', 'Mua hàng'];
const XUONG_SAN_XUAT = ['Tổ trưởng', 'Thợ chính', 'Thợ phụ', 'Nhân viên'];

// Email được phép duyệt xuất âm kho (ngoài Ban giám đốc) — bổ sung khi cần.
const NEGATIVE_STOCK_OVERRIDE_EMAILS = [];

const ALL_PERMISSIONS = [
    'view', 'view_cost',
    'create_document', 'approve_document', 'cancel_document', 'reverse_document',
    'transfer', 'hold_material', 'release_hold', 'confirm_receipt',
    'stocktake', 'manage_material_catalog', 'manage_settings',
    'migration_scan', 'migration_commit',
    'negative_stock_override', 'report',
];

/**
 * @param {{ role?: string, department?: string, email?: string }} user
 * @returns {Record<string, boolean>} inventoryV2.<key> -> boolean
 */
export function getInvPermissions(user) {
    const role = user?.role || '';
    const department = user?.department || '';
    const email = user?.email || '';

    const perms = Object.fromEntries(ALL_PERMISSIONS.map(k => [k, false]));

    if (BAN_GD.includes(role)) {
        // Giám đốc: toàn quyền, kể cả di trú dữ liệu cũ
        ALL_PERMISSIONS.forEach(k => { perms[k] = true; });
        return perms;
    }

    if (KE_TOAN.includes(role)) {
        // Kế toán: xem giá, đơn giá, giá trị kho và báo cáo — không thao tác phiếu
        perms.view = true; perms.view_cost = true; perms.report = true;
        return perms;
    }

    if (role === 'xuong') {
        perms.view = true; perms.report = true;
        if (XUONG_QUAN_DOC.includes(department)) {
            // Quản lý xưởng: tạo phiếu, duyệt theo phạm vi được giao
            perms.view_cost = true;
            perms.create_document = true; perms.approve_document = true;
            perms.cancel_document = true; perms.reverse_document = true;
            perms.transfer = true; perms.hold_material = true; perms.release_hold = true;
            perms.stocktake = true; perms.manage_material_catalog = true; perms.manage_settings = true;
        } else if (XUONG_KHO.includes(department)) {
            // Thủ kho: nhập, xuất, điều chuyển và kiểm kê (không duyệt phiếu người khác tạo mặc định)
            perms.create_document = true; perms.transfer = true;
            perms.hold_material = true; perms.release_hold = true;
            perms.stocktake = true; perms.confirm_receipt = true;
            perms.manage_material_catalog = true;
        } else if (XUONG_SAN_XUAT.includes(department)) {
            // Nhân viên sản xuất: tạo yêu cầu vật tư (phiếu nháp) + xác nhận nhận hàng
            perms.create_document = true; perms.confirm_receipt = true;
        }
        return perms;
    }

    if (role === 'viewer') {
        perms.view = true;
        return perms;
    }

    // Mặc định (role không xác định): chỉ xem, không thấy giá
    perms.view = true;
    return perms;
}

export function hasInvPermission(user, key) {
    if (key === 'negative_stock_override') {
        if (BAN_GD.includes(user?.role)) return true;
        return NEGATIVE_STOCK_OVERRIDE_EMAILS.includes(user?.email || '');
    }
    return !!getInvPermissions(user)[key];
}

/**
 * Dùng trong API route: trả về {error,status} nếu thiếu quyền, null nếu đủ quyền.
 * @param {object} session - session từ withAuth (session.user)
 * @param {string} key - 1 trong ALL_PERMISSIONS
 */
export function assertInvPermission(session, key) {
    if (!hasInvPermission(session?.user, key)) {
        return { error: 'Bạn không có quyền thực hiện thao tác này', status: 403 };
    }
    return null;
}

export { ALL_PERMISSIONS as INV_PERMISSION_KEYS };
