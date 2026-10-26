import { z } from 'zod';
import { optStr, optDate, optStrPatch, optDatePatch } from './common';
import {
    ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_CATEGORIES, ISSUE_SOURCES, ATTACHMENT_CATEGORIES,
} from '@/lib/customerIssue/constants';

const id = z.string().trim().min(1);
const source = z.enum(ISSUE_SOURCES).or(z.literal(''));
// URL trả về từ /api/upload: tuyệt đối (R2/forward) hoặc tương đối /uploads/...
const fileUrl = z.string().trim().min(1, 'Thiếu đường dẫn tệp').max(2000)
    .refine(v => /^https?:\/\//i.test(v) || v.startsWith('/uploads/'), 'Đường dẫn tệp không hợp lệ');

export const customerIssueCreateSchema = z.object({
    customerId: id.optional(),
    projectId: id.optional().nullable(),
    title: z.string().trim().min(1, 'Tiêu đề bắt buộc').max(200),
    area: optStr,
    category: z.enum(ISSUE_CATEGORIES, { message: 'Nhóm vấn đề không hợp lệ' }),
    description: z.string().trim().min(1, 'Nội dung vấn đề bắt buộc').max(10000),
    priority: z.enum(ISSUE_PRIORITIES, { message: 'Mức ưu tiên không hợp lệ' }).optional().default('MEDIUM'),
    source: source.optional().default(''),
    reporterName: optStr,
    reporterPhone: optStr,
    reportedAt: optDate,
    dueDate: optDate,
    assigneeId: id.optional().nullable(),
    collaboratorIds: z.array(id).max(30).optional().default([]),
}).strict().refine(d => d.customerId || d.projectId, { message: 'Cần chọn khách hàng hoặc dự án', path: ['customerId'] });

// Trạng thái và người phụ trách không sửa qua đây — dùng API chuyển trạng thái / phân công
export const customerIssueUpdateSchema = z.object({
    projectId: id.optional().nullable(),
    title: z.string().trim().min(1, 'Tiêu đề bắt buộc').max(200).optional(),
    area: optStrPatch,
    category: z.enum(ISSUE_CATEGORIES, { message: 'Nhóm vấn đề không hợp lệ' }).optional(),
    description: z.string().trim().min(1, 'Nội dung vấn đề bắt buộc').max(10000).optional(),
    priority: z.enum(ISSUE_PRIORITIES, { message: 'Mức ưu tiên không hợp lệ' }).optional(),
    source: source.optional(),
    reporterName: optStrPatch,
    reporterPhone: optStrPatch,
    reportedAt: optDatePatch,
    dueDate: optDatePatch,
    resolution: z.string().trim().max(10000).optional(),
}).strict();

export const customerIssueAssignSchema = z.object({
    assigneeId: id.nullable(),
}).strict();

export const customerIssueTransitionSchema = z.object({
    toStatus: z.enum(ISSUE_STATUSES, { message: 'Trạng thái không hợp lệ' }),
    reason: optStr,
    resolution: z.string().trim().max(10000).optional(),
}).strict();

export const customerIssueCollaboratorSchema = z.object({
    userId: id,
}).strict();

export const customerIssueAttachmentSchema = z.object({
    category: z.enum(ATTACHMENT_CATEGORIES, { message: 'Loại tệp không hợp lệ' }),
    url: fileUrl,
    thumbnailUrl: z.string().trim().max(2000).optional().default(''),
    fileName: optStr,
    mimeType: optStr,
    caption: optStr,
}).strict();

export const customerIssueNoteSchema = z.object({
    message: z.string().trim().min(1, 'Nội dung ghi chú bắt buộc').max(5000),
}).strict();

export const customerIssueWorkOrderSchema = z.discriminatedUnion('mode', [
    z.object({
        mode: z.literal('create'),
        title: z.string().trim().min(1, 'Tiêu đề phiếu bắt buộc').max(200),
        description: optStr,
        assignee: optStr,
        dueDate: optDate,
        category: optStr,
    }).strict(),
    z.object({
        mode: z.literal('link'),
        workOrderId: id,
    }).strict(),
]);

/**
 * Parse body bằng safeParse để trả lỗi 400 rõ ràng (zod 4 không còn `error.errors`).
 * @returns {{ data: any } | { error: { error: string, details: {path: string, message: string}[] } }}
 */
export function parseIssueInput(schema, body) {
    const result = schema.safeParse(body ?? {});
    if (result.success) return { data: result.data };
    const details = result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return { error: { error: details[0]?.message || 'Dữ liệu không hợp lệ', details } };
}
