import { z } from 'zod';
import { optStr, optFloat, optInt } from './common';

// Helper: optional date string → Date
const dateStr = z.string().transform(v => new Date(v));
const optDateStr = z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? undefined : v),
    z.string().transform(v => new Date(v)).optional()
);

export const scheduleTaskCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên hạng mục bắt buộc'),
    projectId: z.string().min(1, 'Dự án bắt buộc'),
    startDate: dateStr,
    endDate: dateStr,
    duration: z.number().int().min(1).optional().default(1),
    order: optInt,
    level: optInt,
    wbs: optStr,
    progress: z.number().int().min(0).max(100).optional().default(0),
    weight: z.number().min(0).optional().default(1),
    status: optStr.default('Chưa bắt đầu'),
    assignee: optStr,
    notes: optStr,
    color: optStr,
    parentId: z.string().optional().nullable().default(null),
    predecessorId: z.string().optional().nullable().default(null),
});

export const scheduleTaskUpdateSchema = z.object({
    name: z.string().trim().optional(),
    startDate: optDateStr,
    endDate: optDateStr,
    duration: z.number().int().min(1).optional(),
    order: z.number().int().optional(),
    level: z.number().int().optional(),
    wbs: z.string().optional(),
    progress: z.number().int().min(0).max(100).optional(),
    weight: z.number().min(0).optional(),
    status: z.string().optional(),
    assignee: z.string().optional(),
    notes: z.string().optional(),
    color: z.string().optional(),
    parentId: z.string().optional().nullable(),
    predecessorId: z.string().optional().nullable(),
    baselineStart: optDateStr.nullable(),
    baselineEnd: optDateStr.nullable(),
});

// Bulk update for drag & drop
export const scheduleTaskBulkUpdateSchema = z.array(
    z.object({
        id: z.string(),
        startDate: optDateStr,
        endDate: optDateStr,
        duration: z.number().int().optional(),
        progress: z.number().int().min(0).max(100).optional(),
        order: z.number().int().optional(),
    })
);

// Import template
export const scheduleImportSchema = z.object({
    projectId: z.string().min(1),
    templateId: z.string().min(1),
    startDate: dateStr,
});
