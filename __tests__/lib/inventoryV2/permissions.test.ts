import { describe, it, expect } from 'vitest';
import { getInvPermissions, hasInvPermission } from '@/lib/inventoryV2/permissions';

describe('getInvPermissions — Kho vật tư xưởng 2.0 (mục 13 spec)', () => {
    it('Giám đốc: toàn quyền kể cả di trú dữ liệu cũ', () => {
        const perms = getInvPermissions({ role: 'ban_gd' });
        expect(perms.approve_document).toBe(true);
        expect(perms.view_cost).toBe(true);
        expect(perms.migration_commit).toBe(true);
    });

    it('Kế toán: xem giá/giá trị/báo cáo nhưng không thao tác phiếu', () => {
        const perms = getInvPermissions({ role: 'hanh_chinh_kt' });
        expect(perms.view_cost).toBe(true);
        expect(perms.report).toBe(true);
        expect(perms.create_document).toBe(false);
        expect(perms.approve_document).toBe(false);
    });

    it('Quản lý xưởng (xuong + Quản đốc): tạo và duyệt phiếu trong phạm vi', () => {
        const perms = getInvPermissions({ role: 'xuong', department: 'Quản đốc' });
        expect(perms.create_document).toBe(true);
        expect(perms.approve_document).toBe(true);
        expect(perms.view_cost).toBe(true);
    });

    it('Thủ kho (xuong + Kho): nhập/xuất/điều chuyển/kiểm kê nhưng không tự duyệt', () => {
        const perms = getInvPermissions({ role: 'xuong', department: 'Kho' });
        expect(perms.create_document).toBe(true);
        expect(perms.transfer).toBe(true);
        expect(perms.stocktake).toBe(true);
        expect(perms.approve_document).toBe(false);
    });

    it('Nhân viên sản xuất (xuong + Thợ chính): chỉ tạo yêu cầu + xác nhận nhận hàng', () => {
        const perms = getInvPermissions({ role: 'xuong', department: 'Thợ chính' });
        expect(perms.create_document).toBe(true);
        expect(perms.confirm_receipt).toBe(true);
        expect(perms.approve_document).toBe(false);
        expect(perms.transfer).toBe(false);
    });

    it('Viewer: chỉ xem, không thấy giá', () => {
        const perms = getInvPermissions({ role: 'viewer' });
        expect(perms.view).toBe(true);
        expect(perms.view_cost).toBe(false);
        expect(perms.create_document).toBe(false);
    });

    it('negative_stock_override: chỉ Ban giám đốc hoặc email trong allow-list', () => {
        expect(hasInvPermission({ role: 'ban_gd' }, 'negative_stock_override')).toBe(true);
        expect(hasInvPermission({ role: 'xuong', department: 'Kho' }, 'negative_stock_override')).toBe(false);
    });
});
