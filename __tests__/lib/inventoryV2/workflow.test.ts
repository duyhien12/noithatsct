import { describe, it, expect } from 'vitest';
import {
    canTransition, docTypeMeta, DOC_TYPE_META,
    assertDocumentCanSubmit, assertDocumentCanApprove, assertDocumentCanReject,
    assertDocumentCanCancel, assertDocumentEditable,
} from '@/lib/inventoryV2/workflow';

describe('canTransition — Nháp → Chờ duyệt → Đã duyệt/Đã hủy (mục 7 spec)', () => {
    it('allows the documented flow', () => {
        expect(canTransition('DRAFT', 'PENDING_APPROVAL')).toBe(true);
        expect(canTransition('PENDING_APPROVAL', 'APPROVED')).toBe(true);
        expect(canTransition('PENDING_APPROVAL', 'DRAFT')).toBe(true); // reject
        expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
    });

    it('forbids skipping straight from Nháp to Đã duyệt', () => {
        expect(canTransition('DRAFT', 'APPROVED')).toBe(false);
    });

    it('APPROVED and CANCELLED are terminal — không sửa/xóa trực tiếp phiếu đã duyệt', () => {
        expect(canTransition('APPROVED', 'CANCELLED')).toBe(false);
        expect(canTransition('APPROVED', 'DRAFT')).toBe(false);
        expect(canTransition('CANCELLED', 'DRAFT')).toBe(false);
    });
});

describe('docTypeMeta — phân loại nghiệp vụ theo docType', () => {
    it('mọi docType trong DOC_TYPE_META đều có class/direction/prefix hợp lệ', () => {
        for (const key of Object.keys(DOC_TYPE_META)) {
            const meta = docTypeMeta(key);
            expect(['LEDGER', 'TRANSFER', 'RESERVE', 'RELEASE']).toContain(meta.class);
            expect(['IN', 'OUT', 'TRANSFER', 'NONE']).toContain(meta.direction);
            expect(meta.prefix).toBeTruthy();
        }
    });

    it('throws on unknown docType', () => {
        expect(() => docTypeMeta('KHONG_TON_TAI')).toThrow();
    });

    it('IMPORT_* → direction IN, EXPORT_* → direction OUT', () => {
        expect(docTypeMeta('IMPORT_PURCHASE').direction).toBe('IN');
        expect(docTypeMeta('EXPORT_PROJECT').direction).toBe('OUT');
    });

    it('HOLD → RESERVE, RELEASE_HOLD → RELEASE', () => {
        expect(docTypeMeta('HOLD').class).toBe('RESERVE');
        expect(docTypeMeta('RELEASE_HOLD').class).toBe('RELEASE');
    });
});

describe('assertDocumentCanSubmit', () => {
    it('rejects a document with no lines', () => {
        expect(assertDocumentCanSubmit({ status: 'DRAFT', lines: [] })).not.toBeNull();
    });
    it('rejects submitting from a non-DRAFT status', () => {
        expect(assertDocumentCanSubmit({ status: 'APPROVED', lines: [{}] })).not.toBeNull();
    });
    it('allows a DRAFT document with lines', () => {
        expect(assertDocumentCanSubmit({ status: 'DRAFT', lines: [{}] })).toBeNull();
    });
});

describe('assertDocumentCanApprove', () => {
    it('rejects approving a DRAFT document directly (phải Chờ duyệt trước — ở đây PENDING_APPROVAL mới được duyệt, nhưng DRAFT→APPROVED bị chặn theo canTransition)', () => {
        expect(assertDocumentCanApprove({ status: 'DRAFT', lines: [{}] })).not.toBeNull();
    });
    it('allows approving from PENDING_APPROVAL with lines', () => {
        expect(assertDocumentCanApprove({ status: 'PENDING_APPROVAL', lines: [{}] })).toBeNull();
    });
});

describe('assertDocumentCanReject', () => {
    it('chỉ từ chối được phiếu đang Chờ duyệt', () => {
        expect(assertDocumentCanReject({ status: 'DRAFT' })).not.toBeNull();
        expect(assertDocumentCanReject({ status: 'PENDING_APPROVAL' })).toBeNull();
    });
});

describe('assertDocumentCanCancel', () => {
    it('không hủy trực tiếp phiếu đã duyệt — phải lập phiếu đảo', () => {
        expect(assertDocumentCanCancel({ status: 'APPROVED' })).not.toBeNull();
    });
    it('cho phép hủy phiếu Nháp hoặc Chờ duyệt', () => {
        expect(assertDocumentCanCancel({ status: 'DRAFT' })).toBeNull();
        expect(assertDocumentCanCancel({ status: 'PENDING_APPROVAL' })).toBeNull();
    });
});

describe('assertDocumentEditable', () => {
    it('chỉ sửa được phiếu Nháp', () => {
        expect(assertDocumentEditable({ status: 'DRAFT' })).toBeNull();
        expect(assertDocumentEditable({ status: 'PENDING_APPROVAL' })).not.toBeNull();
        expect(assertDocumentEditable({ status: 'APPROVED' })).not.toBeNull();
    });
});
