import { describe, it, expect } from 'vitest';
import {
    assertTransition, allowedTargets, transitionFields, defaultDueDate,
    appendResolution, shouldAwaitConfirmation, isOverdue, boardColumnOf, dropTargetStatus, dropRejectReason,
} from '@/lib/customerIssue/workflow';
import { getIssuePermissions } from '@/lib/customerIssue/permissions';
import { KANBAN_BOARD, ISSUE_STATUSES, WORK_ORDER_DONE_STATUS } from '@/lib/customerIssue/constants';

const all = getIssuePermissions({ role: 'ban_gd' });

describe('assertTransition', () => {
    it('cho phép NEW -> IN_PROGRESS', () => {
        expect(assertTransition({ status: 'NEW', resolution: '' }, 'IN_PROGRESS', { perms: all })).toBeNull();
    });
    it('chặn bước nhảy không hợp lệ NEW -> DONE', () => {
        expect(assertTransition({ status: 'NEW' }, 'DONE', { perms: all })).toMatch(/Không thể chuyển/);
    });
    it('chặn chuyển về đúng trạng thái hiện tại', () => {
        expect(assertTransition({ status: 'NEW' }, 'NEW', { perms: all })).not.toBeNull();
    });
    it('bắt buộc kết quả xử lý trước khi Chờ xác nhận', () => {
        expect(assertTransition({ status: 'IN_PROGRESS', resolution: '' }, 'WAITING_CONFIRMATION', { perms: all })).toMatch(/kết quả xử lý/);
        expect(assertTransition({ status: 'IN_PROGRESS', resolution: '' }, 'WAITING_CONFIRMATION', { perms: all, resolution: 'Đã thay bản lề' })).toBeNull();
        expect(assertTransition({ status: 'IN_PROGRESS', resolution: 'Đã sửa' }, 'WAITING_CONFIRMATION', { perms: all })).toBeNull();
    });
    it('bắt buộc lý do khi huỷ / không đạt / mở lại', () => {
        expect(assertTransition({ status: 'NEW' }, 'CANCELLED', { perms: all })).toMatch(/lý do/);
        expect(assertTransition({ status: 'WAITING_CONFIRMATION' }, 'IN_PROGRESS', { perms: all, reason: '  ' })).toMatch(/lý do/);
        expect(assertTransition({ status: 'DONE' }, 'IN_PROGRESS', { perms: all, reason: 'Khách báo lại' })).toBeNull();
    });
    it('chặn khi thiếu quyền (nhân viên xây dựng không được xác nhận hoàn thành)', () => {
        const staff = getIssuePermissions({ role: 'xay_dung', department: 'Nhân viên' });
        expect(assertTransition({ status: 'WAITING_CONFIRMATION' }, 'DONE', { perms: staff })).toMatch(/quyền/);
    });
});

describe('allowedTargets', () => {
    it('liệt kê bước hợp lệ theo quyền', () => {
        expect(allowedTargets('NEW', all).sort()).toEqual(['CANCELLED', 'IN_PROGRESS']);
        const staff = getIssuePermissions({ role: 'xay_dung' });
        expect(allowedTargets('NEW', staff)).toEqual(['IN_PROGRESS']);
        expect(allowedTargets('WAITING_CONFIRMATION', staff)).toEqual([]);
    });
});

describe('transitionFields', () => {
    const now = new Date('2026-10-24T08:00:00Z');
    const actor = { id: 'u1', name: 'A' };
    it('ghi người xác nhận khi DONE', () => {
        expect(transitionFields('DONE', { actor, now })).toMatchObject({ status: 'DONE', confirmedAt: now, confirmedById: 'u1', confirmedByName: 'A' });
    });
    it('ghi thời điểm xử lý xong khi Chờ xác nhận và lưu lý do', () => {
        expect(transitionFields('WAITING_CONFIRMATION', { actor, now, reason: ' ok ' })).toMatchObject({ resolvedAt: now, statusReason: 'ok' });
    });
});

describe('defaultDueDate', () => {
    it('tính theo mức ưu tiên', () => {
        const from = new Date('2026-10-01T00:00:00Z');
        expect(defaultDueDate('URGENT', from).toISOString()).toBe('2026-10-02T00:00:00.000Z');
        expect(defaultDueDate('LOW', from).toISOString()).toBe('2026-10-15T00:00:00.000Z');
        expect(defaultDueDate('???', from).toISOString()).toBe('2026-10-08T00:00:00.000Z');
    });
});

describe('appendResolution', () => {
    it('nối dòng mới, bỏ qua dòng rỗng', () => {
        expect(appendResolution('', 'WO001: xong')).toBe('WO001: xong');
        expect(appendResolution('Đã kiểm tra', 'WO001: xong')).toBe('Đã kiểm tra\nWO001: xong');
        expect(appendResolution('Giữ nguyên', '  ')).toBe('Giữ nguyên');
    });
});

describe('shouldAwaitConfirmation', () => {
    const done = { status: WORK_ORDER_DONE_STATUS };
    it('chỉ khi mọi phiếu đã hoàn thành và vấn đề đang mở', () => {
        expect(shouldAwaitConfirmation('IN_PROGRESS', [done, done])).toBe(true);
        expect(shouldAwaitConfirmation('IN_PROGRESS', [done, { status: 'Đang xử lý' }])).toBe(false);
        expect(shouldAwaitConfirmation('IN_PROGRESS', [])).toBe(false);
        expect(shouldAwaitConfirmation('DONE', [done])).toBe(false);
        expect(shouldAwaitConfirmation('CANCELLED', [done])).toBe(false);
    });
});

describe('isOverdue', () => {
    const now = new Date('2026-10-24T00:00:00Z');
    it('chỉ tính vấn đề còn mở', () => {
        expect(isOverdue({ status: 'IN_PROGRESS', dueDate: '2026-10-20' }, now)).toBe(true);
        expect(isOverdue({ status: 'DONE', dueDate: '2026-10-20' }, now)).toBe(false);
        expect(isOverdue({ status: 'NEW', dueDate: null }, now)).toBe(false);
    });
});

describe('Kanban', () => {
    it('có đúng 4 cột, không gồm CANCELLED, chỉ dùng mã trạng thái có sẵn', () => {
        expect(KANBAN_BOARD.map(c => c.label)).toEqual(['Mới tiếp nhận', 'Đang xử lý', 'Chờ phối hợp', 'Chờ xác nhận / Hoàn thành']);
        const statuses = KANBAN_BOARD.flatMap(c => c.statuses);
        expect(statuses).not.toContain('CANCELLED');
        statuses.forEach(s => expect(ISSUE_STATUSES).toContain(s));
    });
    it('xếp cột theo trạng thái và phiếu công việc đang mở', () => {
        expect(boardColumnOf({ status: 'NEW' })).toBe('NEW');
        expect(boardColumnOf({ status: 'IN_PROGRESS', openWorkOrderCount: 0 })).toBe('IN_PROGRESS');
        expect(boardColumnOf({ status: 'IN_PROGRESS', openWorkOrderCount: 2 })).toBe('COORDINATION');
        expect(boardColumnOf({ status: 'WAITING_CONFIRMATION' })).toBe('CLOSING');
        expect(boardColumnOf({ status: 'DONE' })).toBe('CLOSING');
        expect(boardColumnOf({ status: 'CANCELLED' })).toBeNull();
    });
    it('thả thẻ theo đúng workflow và quyền', () => {
        expect(dropTargetStatus({ status: 'NEW' }, 'IN_PROGRESS', all)).toBe('IN_PROGRESS');
        expect(dropTargetStatus({ status: 'IN_PROGRESS' }, 'CLOSING', all)).toBe('WAITING_CONFIRMATION');
        expect(dropTargetStatus({ status: 'DONE' }, 'IN_PROGRESS', all)).toBe('IN_PROGRESS');
        // Cột "Chờ phối hợp" tự tính, không nhận thả; cùng nhóm trạng thái thì bỏ qua
        expect(dropTargetStatus({ status: 'NEW' }, 'COORDINATION', all)).toBeNull();
        expect(dropTargetStatus({ status: 'IN_PROGRESS' }, 'IN_PROGRESS', all)).toBeNull();
        expect(dropTargetStatus({ status: 'WAITING_CONFIRMATION' }, 'CLOSING', all)).toBeNull();
        // Bước nhảy không có trong workflow
        expect(dropTargetStatus({ status: 'NEW' }, 'CLOSING', all)).toBeNull();
        expect(dropTargetStatus({ status: 'IN_PROGRESS' }, 'NEW', all)).toBeNull();
        // Thiếu quyền: nhân viên xây dựng không mở lại được vấn đề đã xong
        const staff = getIssuePermissions({ role: 'xay_dung' });
        expect(dropTargetStatus({ status: 'DONE' }, 'IN_PROGRESS', staff)).toBeNull();
    });
    it('báo lý do tiếng Việt khi thả sai, im lặng khi thả lại đúng cột', () => {
        const staff = getIssuePermissions({ role: 'xay_dung' });
        expect(dropRejectReason({ status: 'NEW' }, 'NEW', all)).toBeNull();
        expect(dropRejectReason({ status: 'NEW' }, 'IN_PROGRESS', all)).toBeNull();
        expect(dropRejectReason({ status: 'WAITING_CONFIRMATION' }, 'CLOSING', all)).toBeNull();
        expect(dropRejectReason({ status: 'NEW' }, 'COORDINATION', all)).toMatch(/tự động/);
        expect(dropRejectReason({ status: 'NEW' }, 'CLOSING', all)).toMatch(/Không thể chuyển từ "Mới tiếp nhận"/);
        expect(dropRejectReason({ status: 'IN_PROGRESS' }, 'NEW', all)).toMatch(/Không thể chuyển/);
        expect(dropRejectReason({ status: 'DONE' }, 'IN_PROGRESS', staff)).toMatch(/không có quyền/);
        // Thẻ ở "Chờ phối hợp" kéo sang "Đang xử lý": cùng trạng thái -> bỏ qua
        expect(dropRejectReason({ status: 'IN_PROGRESS', openWorkOrderCount: 1 }, 'IN_PROGRESS', all)).toBeNull();
    });
});
