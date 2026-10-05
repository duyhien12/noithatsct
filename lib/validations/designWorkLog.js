import { z } from 'zod';
import { optStr, optStrPatch } from './common';
import { DESIGN_WORK_LOG_CATEGORY_KEYS, DESIGN_WORK_LOG_SHIFTS } from '@/lib/designWorkLog';

const worker = z.object({
    name: z.string().trim().min(1),
    hours: z.number().positive().nullable().optional().default(null),
});
const workers = z.array(worker).transform(v => JSON.stringify(v));
const shift = z.enum(DESIGN_WORK_LOG_SHIFTS, { message: 'Ca không hợp lệ' });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ').transform(v => new Date(v));

export const designWorkLogCreateSchema = z.object({
    date,
    shift: shift.optional().default('Sáng'),
    category: z.enum(DESIGN_WORK_LOG_CATEGORY_KEYS, { message: 'Hạng mục không hợp lệ' }),
    projectName: optStr,
    requestDept: optStr,
    workers: workers.optional().default('[]'),
    note: optStr,
}).strict();

export const designWorkLogUpdateSchema = z.object({
    shift: shift.optional(),
    projectName: optStrPatch,
    requestDept: optStrPatch,
    workers: workers.optional(),
    note: optStrPatch,
}).strict().partial();
