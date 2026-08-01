import { z } from 'zod';
import { optStr, optDate, optStrPatch, optDatePatch } from './common';

export const designTaskCreateSchema = z.object({
    customerId: z.string().min(1, 'Khách hàng bắt buộc'),
    title: optStr,
    executorName: optStr,
    startDate: optDate,
    endDate: optDate,
    status: optStr.default('Việc cần làm'),
    notes: optStr,
}).strict();

export const designTaskUpdateSchema = z.object({
    customerId: z.string().min(1).optional(),
    title: optStrPatch,
    executorName: optStrPatch,
    startDate: optDatePatch,
    endDate: optDatePatch,
    status: optStrPatch,
    notes: optStrPatch,
}).strict().partial();
