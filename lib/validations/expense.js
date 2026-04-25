import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

export const expenseCreateSchema = z.object({
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    amount: z.number().min(0, 'Số tiền phải >= 0'),
    projectId: z.string().optional().nullable().default(null),
    expenseType: optStr.default('Dự án'),
    department: optStr.default(''),
    category: optStr.default('Khác'),
    status: optStr.default('Chờ duyệt'),
    submittedBy: optStr,
    notes: optStr,
    date: optDate,
    recipientType: optStr,
    recipientId: optStr,
    recipientName: optStr,
}).strict();

export const expenseUpdateSchema = z.object({
    description: optStr,
    amount: optFloat,
    projectId: z.string().optional().nullable(),
    expenseType: optStr,
    department: optStr,
    category: optStr,
    status: optStr,
    submittedBy: optStr,
    approvedBy: optStr,
    paidAmount: optFloat,
    proofUrl: optStr,
    notes: optStr,
    date: optDate,
    recipientType: optStr,
    recipientId: optStr,
    recipientName: optStr,
}).strict();
