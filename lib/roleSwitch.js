/**
 * Tài khoản được phép "xem như" phòng ban khác (chọn trên giao diện, lưu trong localStorage).
 * Isomorphic: dùng cả ở RoleContext (client) lẫn API route (server).
 */
export const SWITCH_ROLE_EMAILS = ['phamduong@kientrucsct.com', 'motnha@kientrucsct.com', 'buihoa@kientrucsct.com'];
export const SWITCH_ROLE_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export function canSwitchRole(user) {
    return SWITCH_ROLE_EMAILS.includes(user?.email || '') || SWITCH_ROLE_ROLES.includes(user?.role || '');
}
