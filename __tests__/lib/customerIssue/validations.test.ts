import { describe, it, expect } from 'vitest';
import {
    customerIssueCreateSchema, customerIssueUpdateSchema, customerIssueTransitionSchema,
    customerIssueAttachmentSchema, customerIssueWorkOrderSchema, parseIssueInput,
} from '@/lib/validations/customerIssue';

// Kết quả là union { data } | { error } — test đọc cả hai nhánh nên nới kiểu
const parse = (schema: any, body: any): any => parseIssueInput(schema, body);

const base = { customerId: 'c1', title: 'Cửa tủ lệch', category: 'FURNITURE', description: 'Cánh tủ bếp lệch 5mm' };

describe('customerIssueCreateSchema', () => {
    it('nhận dữ liệu tối thiểu và đặt mặc định', () => {
        const r = parse(customerIssueCreateSchema, base);
        expect(r.error).toBeUndefined();
        expect(r.data).toMatchObject({ priority: 'MEDIUM', area: '', collaboratorIds: [] });
    });
    it('cần khách hàng hoặc dự án', () => {
        const r = parse(customerIssueCreateSchema, { ...base, customerId: undefined });
        expect(r.error?.error).toMatch(/khách hàng hoặc dự án/);
        expect(parse(customerIssueCreateSchema, { ...base, customerId: undefined, projectId: 'p1' }).error).toBeUndefined();
    });
    it('chặn mã không hợp lệ và nhãn tiếng Việt', () => {
        expect(parse(customerIssueCreateSchema, { ...base, priority: 'Cao' }).error).toBeDefined();
        expect(parse(customerIssueCreateSchema, { ...base, category: 'Đồ nội thất' }).error).toBeDefined();
    });
    it('chặn trường lạ (status không được đặt khi tạo)', () => {
        expect(parse(customerIssueCreateSchema, { ...base, status: 'DONE' }).error).toBeDefined();
    });
    it('bắt buộc tiêu đề và nội dung', () => {
        const r = parse(customerIssueCreateSchema, { ...base, title: '  ', description: '' });
        expect(r.error?.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(['title', 'description']));
    });
});

describe('customerIssueUpdateSchema', () => {
    it('trường không gửi thì không xuất hiện (không ghi đè)', () => {
        const r = parse(customerIssueUpdateSchema, { title: 'Mới' });
        expect(r.data).toEqual({ title: 'Mới' });
    });
    it('không cho đổi trạng thái/người phụ trách qua PATCH', () => {
        expect(parse(customerIssueUpdateSchema, { status: 'DONE' }).error).toBeDefined();
        expect(parse(customerIssueUpdateSchema, { assigneeId: 'u1' }).error).toBeDefined();
    });
});

describe('customerIssueTransitionSchema', () => {
    it('chỉ nhận mã trạng thái', () => {
        expect(parse(customerIssueTransitionSchema, { toStatus: 'IN_PROGRESS' }).data).toMatchObject({ toStatus: 'IN_PROGRESS', reason: '' });
        expect(parse(customerIssueTransitionSchema, { toStatus: 'Đang xử lý' }).error).toBeDefined();
    });
});

describe('customerIssueAttachmentSchema', () => {
    it('nhận URL từ /api/upload (tương đối hoặc tuyệt đối)', () => {
        expect(parse(customerIssueAttachmentSchema, { category: 'BEFORE', url: '/uploads/proofs/a.jpg' }).error).toBeUndefined();
        expect(parse(customerIssueAttachmentSchema, { category: 'AFTER', url: 'https://cdn.example.com/x.png' }).error).toBeUndefined();
    });
    it('chặn URL lạ và loại tệp sai', () => {
        expect(parse(customerIssueAttachmentSchema, { category: 'BEFORE', url: 'javascript:alert(1)' }).error).toBeDefined();
        expect(parse(customerIssueAttachmentSchema, { category: 'PHOTO', url: '/uploads/proofs/a.jpg' }).error).toBeDefined();
    });
});

describe('customerIssueWorkOrderSchema', () => {
    it('phân biệt tạo mới và liên kết', () => {
        expect(parse(customerIssueWorkOrderSchema, { mode: 'create', title: 'Sửa tủ' }).error).toBeUndefined();
        expect(parse(customerIssueWorkOrderSchema, { mode: 'link', workOrderId: 'w1' }).error).toBeUndefined();
        expect(parse(customerIssueWorkOrderSchema, { mode: 'link' }).error).toBeDefined();
        expect(parse(customerIssueWorkOrderSchema, { mode: 'other' }).error).toBeDefined();
    });
});
