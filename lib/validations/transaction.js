import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

export const transactionCreateSchema = z.object({
    type: z.enum(['Thu', 'Chi']).default('Thu'),
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    amount: z.number().min(0, 'Số tiền phải >= 0'),
    category: optStr,
    date: optDate,
    projectId: z.string().optional().nullable().default(null),
}).strict();

export const transactionUpdateSchema = transactionCreateSchema.partial();
