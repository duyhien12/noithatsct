import { z } from 'zod';
import { optStr } from './common';
import { CATEGORIES, SEVERITIES, STATUSES } from '@/lib/lessonLearned';

const attachmentSchema = z.object({
    url: z.string(),
    name: z.string().optional().default(''),
    type: z.string().optional().default(''),
});

export const lessonLearnedCreateSchema = z.object({
    occurredAt: z.string().min(1, 'Ngày phát sinh bắt buộc').transform(v => new Date(v)),
    projectId: z.string().optional().nullable().default(null),
    projectName: optStr,
    customerId: z.string().optional().nullable().default(null),
    customerName: optStr,
    category: z.enum(CATEGORIES).optional().default('Khác'),
    severity: z.enum(SEVERITIES).optional().default('Trung bình'),
    issueContent: z.string().trim().min(1, 'Nội dung sự việc bắt buộc'),
    cause: optStr,
    solution: optStr,
    prevention: optStr,
    notes: optStr,
    assignee: optStr,
    status: z.enum(STATUSES).optional().default('Đang xử lý'),
    attachments: z.array(attachmentSchema).optional().default([]),
}).strict();

export const lessonLearnedUpdateSchema = lessonLearnedCreateSchema;

export const lessonLearnedStatusSchema = z.object({
    status: z.enum(STATUSES),
}).strict();
