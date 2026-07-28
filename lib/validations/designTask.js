import { z } from 'zod';
import { optStr, optDate } from './common';

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
    title: optStr,
    executorName: optStr,
    startDate: optDate,
    endDate: optDate,
    status: optStr,
    notes: optStr,
}).strict().partial();
