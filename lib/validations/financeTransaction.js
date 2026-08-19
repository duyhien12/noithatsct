import { z } from 'zod';
import { optStr, optDate } from './common';
import { DEPARTMENTS, TRANSACTION_TYPES, PAYMENT_METHODS, OBJECT_TYPES } from '@/lib/financeJournal';

const attachmentSchema = z.object({
    url: z.string(),
    name: z.string().optional().default(''),
});

export const financeTransactionCreateSchema = z.object({
    date: z.string().min(1, 'Ngày giao dịch bắt buộc').transform(v => new Date(v)),
    type: z.enum(TRANSACTION_TYPES, { error: 'Loại giao dịch không hợp lệ' }),
    method: z.enum(PAYMENT_METHODS, { error: 'Phương thức thanh toán không hợp lệ' }),
    amount: z.number({ error: 'Số tiền không hợp lệ' }).positive('Số tiền phải lớn hơn 0'),
    department: z.enum(DEPARTMENTS, { error: 'Phòng ban bắt buộc' }),
    projectId: z.string().optional().nullable().default(null),
    content: z.string().trim().min(1, 'Nội dung bắt buộc'),
    detail: optStr,
    debitAccountId: z.string().min(1, 'TK Nợ bắt buộc'),
    creditAccountId: z.string().min(1, 'TK Có bắt buộc'),
    bankAccountId: z.string().optional().nullable().default(null),
    categoryId: z.string().optional().nullable().default(null),
    objectType: z.enum(['', ...OBJECT_TYPES]).optional().default(''),
    objectId: optStr,
    objectName: optStr,
    payerReceiver: optStr,
    itemName: optStr,
    itemUnit: optStr,
    itemQty: z.number().optional().default(0),
    itemUnitPrice: z.number().optional().default(0),
    documentNo: optStr,
    documentDate: optDate,
    attachments: z.array(attachmentSchema).optional().default([]),
    notes: optStr,
    status: z.enum(['Nháp', 'Đã duyệt', 'Đã hạch toán']).optional().default('Nháp'),
}).strict()
    .refine(d => d.method !== 'Chuyển khoản' || !!d.bankAccountId, {
        message: 'Giao dịch chuyển khoản bắt buộc chọn tài khoản ngân hàng',
        path: ['bankAccountId'],
    })
    .refine(d => d.debitAccountId !== d.creditAccountId, {
        message: 'TK Nợ và TK Có không được trùng nhau',
        path: ['creditAccountId'],
    })
    .refine(d => d.status !== 'Đã hạch toán' || d.amount > 0, {
        message: 'Không thể hạch toán giao dịch có số tiền bằng 0',
        path: ['amount'],
    });

export const financeTransactionUpdateSchema = financeTransactionCreateSchema;

export const financeTransactionStatusSchema = z.object({
    status: z.enum(['Nháp', 'Đã duyệt', 'Đã hạch toán', 'Hủy']),
    cancelReason: optStr,
}).strict();
