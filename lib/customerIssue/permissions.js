/**
 * Phân quyền module Đồng hành 360 (CustomerIssue).
 * Isomorphic: dùng cả ở API route lẫn client (useRole()).
 * Tái sử dụng role hệ thống + field `department` (chức danh) như lib/lessonLearned.js —
 * không tạo role mới.
 */
import { hasDeptFullWrite } from '@/lib/deptFullWrite';

export const ADMIN_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];
export const MANAGER_TITLES = ['Trưởng phòng', 'Phó phòng', 'Quản lý'];

export const ISSUE_PERMISSION_KEYS = [
    'view', 'create', 'update', 'assign', 'collaborators', 'transition',
    'confirm', 'cancel', 'reopen', 'delete', 'files', 'note', 'work_order',
];

// Quyền thêm cho người phụ trách / phối hợp của chính vấn đề đó (mọi phòng ban)
export const PARTICIPANT_KEYS = ['view', 'update', 'transition', 'files', 'note'];

function grant(keys) {
    const perms = Object.fromEntries(ISSUE_PERMISSION_KEYS.map(k => [k, false]));
    keys.forEach(k => { perms[k] = true; });
    return perms;
}

/**
 * Quyền theo vai trò/phòng ban (chưa xét vai trò trên từng vấn đề).
 * @param {{ role?: string, department?: string }} user
 * @returns {Record<string, boolean>}
 */
export function getIssuePermissions(user) {
    const role = user?.role || '';
    const isManager = MANAGER_TITLES.includes(user?.department || '');

    if (ADMIN_ROLES.includes(role)) return grant(ISSUE_PERMISSION_KEYS);
    // Tài khoản toàn quyền ghi: như Ban GĐ khi đang ở phòng có module này
    if (hasDeptFullWrite(user) && ['xay_dung', 'kinh_doanh', 'thiet_ke'].includes(role)) {
        return grant(ISSUE_PERMISSION_KEYS);
    }

    if (role === 'xay_dung') {
        return isManager
            ? grant(ISSUE_PERMISSION_KEYS.filter(k => k !== 'delete'))
            : grant(['view', 'create', 'update', 'transition', 'files', 'note', 'work_order']);
    }
    if (role === 'kinh_doanh') {
        return isManager
            ? grant(['view', 'create', 'update', 'confirm', 'files', 'note'])
            : grant(['view', 'create', 'files', 'note']);
    }
    if (role === 'thiet_ke') return grant(['view', 'create', 'note']);
    if (role === 'xuong') return grant(['view', 'note']);
    if (['hanh_chinh_kt', 'ke_toan', 'viewer'].includes(role)) return grant(['view']);
    return grant([]);
}

/** Người dùng có là người phụ trách hoặc phối hợp của vấn đề không. */
export function isIssueParticipant(user, issue) {
    if (!user?.id || !issue) return false;
    if (issue.assigneeId && issue.assigneeId === user.id) return true;
    return (issue.collaborators || []).some(c => c.userId === user.id);
}

/**
 * Quyền trên một vấn đề cụ thể = quyền theo phòng ban ∪ quyền người tham gia.
 * `issue` cần có assigneeId và collaborators[{ userId }].
 */
export function getIssuePermissionsFor(user, issue) {
    const perms = getIssuePermissions(user);
    if (isIssueParticipant(user, issue)) PARTICIPANT_KEYS.forEach(k => { perms[k] = true; });
    return perms;
}

export function hasIssuePermission(user, key, issue) {
    const perms = issue ? getIssuePermissionsFor(user, issue) : getIssuePermissions(user);
    return !!perms[key];
}
