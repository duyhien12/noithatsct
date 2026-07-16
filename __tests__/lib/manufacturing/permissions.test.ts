import { describe, it, expect } from 'vitest';
import { getMfgPermissions, hasMfgPermission } from '@/lib/manufacturing/permissions';

describe('getMfgPermissions — theo role/department (mục VII)', () => {
    it('ban_gd has full permissions', () => {
        const perms = getMfgPermissions({ role: 'ban_gd' });
        expect(perms.approve).toBe(true);
        expect(perms.delete).toBe(true);
        expect(perms.view_cost).toBe(true);
    });

    it('xưởng Quản đốc can create/assign but not approve', () => {
        const perms = getMfgPermissions({ role: 'xuong', department: 'Quản đốc' });
        expect(perms.create).toBe(true);
        expect(perms.assign).toBe(true);
        expect(perms.approve).toBe(false);
    });

    it('xưởng "Quản lý" (department thực tế đang dùng trong DB) can create/assign like Quản đốc', () => {
        const perms = getMfgPermissions({ role: 'xuong', department: 'Quản lý' });
        expect(perms.create).toBe(true);
        expect(perms.assign).toBe(true);
        expect(perms.report).toBe(true);
    });

    it('xưởng "Phó phòng" can create/assign like Quản đốc', () => {
        const perms = getMfgPermissions({ role: 'xuong', department: 'Phó phòng' });
        expect(perms.create).toBe(true);
        expect(perms.manage_material).toBe(true);
    });

    it('xưởng QC can do qc and resolve_issue only', () => {
        const perms = getMfgPermissions({ role: 'xuong', department: 'QC' });
        expect(perms.qc).toBe(true);
        expect(perms.resolve_issue).toBe(true);
        expect(perms.create).toBe(false);
        expect(perms.approve).toBe(false);
    });

    it('xưởng Thợ sản xuất can only start/complete their own work', () => {
        const perms = getMfgPermissions({ role: 'xuong', department: 'Thợ chính' });
        expect(perms.start).toBe(true);
        expect(perms.complete).toBe(true);
        expect(perms.manage_material).toBe(false);
        expect(perms.qc).toBe(false);
    });

    it('kinh_doanh can view but not view_cost', () => {
        const perms = getMfgPermissions({ role: 'kinh_doanh' });
        expect(perms.view).toBe(true);
        expect(perms.view_cost).toBe(false);
    });

    it('ke_toan can view_cost', () => {
        const perms = getMfgPermissions({ role: 'hanh_chinh_kt' });
        expect(perms.view_cost).toBe(true);
    });

    it('viewer only has view', () => {
        const perms = getMfgPermissions({ role: 'viewer' });
        expect(perms.view).toBe(true);
        expect(perms.create).toBe(false);
        expect(perms.delete).toBe(false);
    });

    it('unknown/unauthenticated user defaults to view-only', () => {
        const perms = getMfgPermissions({});
        expect(perms.view).toBe(true);
        expect(perms.create).toBe(false);
    });
});

describe('hasMfgPermission', () => {
    it('matches getMfgPermissions output', () => {
        expect(hasMfgPermission({ role: 'ban_gd' }, 'approve')).toBe(true);
        expect(hasMfgPermission({ role: 'viewer' }, 'approve')).toBe(false);
    });
});
