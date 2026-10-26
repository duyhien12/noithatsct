import { describe, it, expect } from 'vitest';
import { getIssuePermissions, getIssuePermissionsFor, hasIssuePermission, ISSUE_PERMISSION_KEYS } from '@/lib/customerIssue/permissions';

describe('getIssuePermissions', () => {
    it('Ban giám đốc / admin toàn quyền', () => {
        for (const role of ['ban_gd', 'giam_doc', 'pho_gd', 'admin']) {
            const p = getIssuePermissions({ role });
            ISSUE_PERMISSION_KEYS.forEach(k => expect(p[k]).toBe(true));
        }
    });
    it('Quản lý phòng Xây dựng: mọi quyền trừ xoá', () => {
        const p = getIssuePermissions({ role: 'xay_dung', department: 'Trưởng phòng' });
        expect(p.confirm).toBe(true);
        expect(p.assign).toBe(true);
        expect(p.delete).toBe(false);
    });
    it('Nhân viên phòng Xây dựng: không phân công/xác nhận/huỷ/xoá', () => {
        const p = getIssuePermissions({ role: 'xay_dung', department: 'Nhân viên' });
        expect(p.create && p.update && p.transition && p.files && p.work_order).toBe(true);
        expect(p.assign || p.confirm || p.cancel || p.delete || p.collaborators).toBe(false);
    });
    it('Phòng Kinh doanh xem được tình trạng và ghi nhận vấn đề', () => {
        const p = getIssuePermissions({ role: 'kinh_doanh' });
        expect(p.view && p.create).toBe(true);
        expect(p.update || p.transition || p.confirm).toBe(false);
        expect(getIssuePermissions({ role: 'kinh_doanh', department: 'Phó phòng' }).confirm).toBe(true);
    });
    it('viewer / kế toán chỉ xem; marketing và role lạ không có quyền', () => {
        expect(getIssuePermissions({ role: 'viewer' })).toMatchObject({ view: true, create: false });
        expect(getIssuePermissions({ role: 'hanh_chinh_kt' })).toMatchObject({ view: true, note: false });
        expect(getIssuePermissions({ role: 'marketing' }).view).toBe(false);
        expect(getIssuePermissions({}).view).toBe(false);
    });
});

describe('getIssuePermissionsFor — người tham gia vấn đề', () => {
    const issue = { assigneeId: 'u-assignee', collaborators: [{ userId: 'u-collab' }] };
    it('người phụ trách được cập nhật và chuyển trạng thái dù phòng ban chỉ xem', () => {
        const p = getIssuePermissionsFor({ id: 'u-assignee', role: 'xuong' }, issue);
        expect(p.update && p.transition && p.files).toBe(true);
        expect(p.confirm || p.delete).toBe(false);
    });
    it('người phối hợp thuộc phòng không có quyền vẫn xem được vấn đề của mình', () => {
        expect(hasIssuePermission({ id: 'u-collab', role: 'marketing' }, 'view', issue)).toBe(true);
        expect(hasIssuePermission({ id: 'u-other', role: 'marketing' }, 'view', issue)).toBe(false);
    });
});
