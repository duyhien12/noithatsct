import { describe, it, expect } from 'vitest';
import {
    fileExtension, isImageFile, validateIssueFile, validateAttachmentInput,
} from '@/lib/customerIssue/files';

const MB = 1024 * 1024;

describe('fileExtension', () => {
    it('lấy phần mở rộng chữ thường, bỏ query/hash', () => {
        expect(fileExtension('Anh.JPG')).toBe('jpg');
        expect(fileExtension('http://x/u/a.png?v=1#t')).toBe('png');
        expect(fileExtension('khong-duoi')).toBe('');
    });
});

describe('isImageFile', () => {
    it('ưu tiên MIME, không có MIME thì theo phần mở rộng', () => {
        expect(isImageFile({ mimeType: 'image/png', fileName: 'a.pdf' })).toBe(true);
        expect(isImageFile({ mimeType: 'application/pdf', fileName: 'a.png' })).toBe(false);
        expect(isImageFile({ fileName: 'a.webp' })).toBe(true);
        expect(isImageFile({ url: 'http://x/a.pdf' })).toBe(false);
    });
});

describe('validateIssueFile', () => {
    it('ảnh hợp lệ cho mục BEFORE/AFTER', () => {
        expect(validateIssueFile({ name: 'a.jpg', size: MB, type: 'image/jpeg' }, 'BEFORE')).toBeNull();
        expect(validateIssueFile({ name: 'a.heic', size: MB, type: '' }, 'AFTER')).toBeNull();
    });
    it('mục ảnh từ chối tệp không phải ảnh', () => {
        expect(validateIssueFile({ name: 'a.pdf', size: MB, type: 'application/pdf' }, 'AFTER')).toMatch(/không phải ảnh/);
        expect(validateIssueFile({ name: 'a.png', size: MB, type: 'application/pdf' }, 'BEFORE')).toMatch(/không phải ảnh/);
    });
    it('giới hạn dung lượng: ảnh 10 MB, tài liệu 25 MB', () => {
        expect(validateIssueFile({ name: 'a.jpg', size: 11 * MB, type: 'image/jpeg' }, 'BEFORE')).toMatch(/10 MB/);
        expect(validateIssueFile({ name: 'a.pdf', size: 11 * MB }, 'DOCUMENT')).toBeNull();
        expect(validateIssueFile({ name: 'a.pdf', size: 26 * MB }, 'DOCUMENT')).toMatch(/25 MB/);
    });
    it('tài liệu: từ chối định dạng lạ và tệp rỗng', () => {
        expect(validateIssueFile({ name: 'a.exe', size: 10 }, 'DOCUMENT')).toMatch(/không được hỗ trợ/);
        expect(validateIssueFile({ name: 'a.docx', size: 0 }, 'DOCUMENT')).toMatch(/rỗng/);
    });
});

describe('validateAttachmentInput (API)', () => {
    it('mục ảnh chỉ nhận ảnh', () => {
        expect(validateAttachmentInput({ category: 'AFTER', mimeType: 'image/png', fileName: 'a.png', url: '/u/a.png' })).toBeNull();
        expect(validateAttachmentInput({ category: 'AFTER', mimeType: '', fileName: 'a.pdf', url: '/u/a.pdf' })).toMatch(/chỉ nhận tệp ảnh/);
    });
    it('DOCUMENT từ chối định dạng ngoài danh sách', () => {
        expect(validateAttachmentInput({ category: 'DOCUMENT', fileName: 'a.xlsx', url: '/u/a.xlsx' })).toBeNull();
        expect(validateAttachmentInput({ category: 'DOCUMENT', fileName: 'a.exe', url: '/u/a.exe' })).toBe('Định dạng tệp không được hỗ trợ');
    });
});
