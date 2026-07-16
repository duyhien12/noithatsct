import { describe, it, expect } from 'vitest';
import {
    assertOrderCanSubmit, assertOrderCanApprove, assertOrderCanStart, statusAfterApprove,
    assertItemCanPassQC, assertCanPack, assertCanDeliver,
    assertOrderCanCompleteFactory, assertOrderCanComplete,
} from '@/lib/manufacturing/workflow';

describe('assertOrderCanSubmit', () => {
    it('rejects orders without items', () => {
        expect(assertOrderCanSubmit({ items: [] })).toMatch(/hạng mục/);
    });
    it('allows orders with items', () => {
        expect(assertOrderCanSubmit({ items: [{}] })).toBeNull();
    });
});

describe('assertOrderCanApprove', () => {
    it('rejects without items', () => {
        expect(assertOrderCanApprove({ items: [], status: 'WAITING_APPROVAL' })).not.toBeNull();
    });
    it('rejects from an invalid status like IN_PRODUCTION', () => {
        expect(assertOrderCanApprove({ items: [{}], status: 'IN_PRODUCTION' })).not.toBeNull();
    });
    it('allows from WAITING_APPROVAL with items', () => {
        expect(assertOrderCanApprove({ items: [{}], status: 'WAITING_APPROVAL' })).toBeNull();
    });
});

describe('assertOrderCanStart — không cho bắt đầu lệnh chưa duyệt hoặc không có sản phẩm', () => {
    it('rejects without items', () => {
        expect(assertOrderCanStart({ items: [], approvedAt: new Date(), status: 'READY' })).toMatch(/hạng mục/);
    });
    it('rejects when not approved', () => {
        expect(assertOrderCanStart({ items: [{}], approvedAt: null, status: 'READY' })).toMatch(/phê duyệt/);
    });
    it('allows when approved, has items, and status READY', () => {
        expect(assertOrderCanStart({ items: [{}], approvedAt: new Date(), status: 'READY' })).toBeNull();
    });
});

describe('statusAfterApprove', () => {
    it('goes to READY when all material reqs satisfied', () => {
        expect(statusAfterApprove([{ status: 'AVAILABLE' }, { status: 'ISSUED' }])).toBe('READY');
    });
    it('goes to WAITING_MATERIALS when some reqs still pending', () => {
        expect(statusAfterApprove([{ status: 'REQUESTED' }])).toBe('WAITING_MATERIALS');
    });
    it('goes to READY with no material reqs at all', () => {
        expect(statusAfterApprove([])).toBe('READY');
    });
});

describe('assertItemCanPassQC — không đạt QC khi còn lỗi nghiêm trọng', () => {
    it('rejects without a PASSED inspection', () => {
        expect(assertItemCanPassQC({}, null, [])).toMatch(/QC/);
        expect(assertItemCanPassQC({}, { result: 'FAILED' }, [])).toMatch(/QC/);
    });
    it('rejects when open issues remain even if QC passed', () => {
        const openIssues = [{ status: 'OPEN' }];
        expect(assertItemCanPassQC({}, { result: 'PASSED' }, openIssues)).toMatch(/lỗi/);
    });
    it('allows when QC passed and no open issues', () => {
        expect(assertItemCanPassQC({}, { result: 'PASSED' }, [])).toBeNull();
    });
});

describe('assertCanPack — không đóng gói sản phẩm chưa đạt QC', () => {
    it('rejects items not PASSED_QC', () => {
        expect(assertCanPack({ status: 'IN_PROGRESS' })).toMatch(/QC/);
    });
    it('allows PASSED_QC items', () => {
        expect(assertCanPack({ status: 'PASSED_QC' })).toBeNull();
    });
});

describe('assertCanDeliver — không xuất xưởng sản phẩm chưa đóng gói', () => {
    it('rejects items not PACKED', () => {
        expect(assertCanDeliver({ status: 'PASSED_QC' })).toMatch(/đóng gói/);
    });
    it('allows PACKED items', () => {
        expect(assertCanDeliver({ status: 'PACKED' })).toBeNull();
    });
});

describe('assertOrderCanCompleteFactory', () => {
    it('rejects when items not all passed QC', () => {
        const items = [{ status: 'IN_PROGRESS' }];
        expect(assertOrderCanCompleteFactory({}, items, [])).toMatch(/QC/);
    });
    it('rejects when a MAJOR/CRITICAL issue is still open', () => {
        const items = [{ status: 'PASSED_QC' }];
        const issues = [{ status: 'OPEN', severity: 'CRITICAL' }];
        expect(assertOrderCanCompleteFactory({}, items, issues)).toMatch(/nghiêm trọng/);
    });
    it('allows when all items passed QC and no critical issues open', () => {
        const items = [{ status: 'PASSED_QC' }];
        const issues = [{ status: 'RESOLVED', severity: 'CRITICAL' }];
        expect(assertOrderCanCompleteFactory({}, items, issues)).toBeNull();
    });
});

describe('assertOrderCanComplete — còn sản phẩm/lỗi chưa xong thì không cho hoàn thành lệnh', () => {
    it('rejects when items not all terminal', () => {
        const items = [{ status: 'PACKED' }];
        expect(assertOrderCanComplete({}, items, [])).toMatch(/hoàn thành/);
    });
    it('rejects when any issue still open, even if items done', () => {
        const items = [{ status: 'INSTALLED' }];
        const issues = [{ status: 'IN_REPAIR' }];
        expect(assertOrderCanComplete({}, items, issues)).toMatch(/lỗi/);
    });
    it('allows when items terminal and no open issues', () => {
        const items = [{ status: 'INSTALLED' }, { status: 'CANCELLED' }];
        expect(assertOrderCanComplete({}, items, [])).toBeNull();
    });
});
