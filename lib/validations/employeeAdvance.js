import { z } from 'zod';
import { optStr, optDate } from './common';
import { ADVANCE_TYPES, SETTLE_TYPES } from '@/lib/employeeAdvance';
import { DEPARTMENTS } from '@/lib/financeJournal';

const attachmentSchema = z.object({
    url: z.string(),
    name: z.string().optional().default(''),
});

export const employeeAdvanceCreateSchema = z.object({
    employeeId: z.string().min(1, 'Vui lòng chọn nhân viên'),
    projectId: z.string().optional().nullable().default(null),
    advanceType: z.enum(ADVANCE_TYPES, { error: 'Loại tạm ứng không hợp lệ' }).default('Khác'),
    date: z.string().min(1, 'Ngày tạm ứng bắt buộc').transform(v => new Date(v)),
    content: z.string().trim().min(1, 'Nội dung bắt buộc'),
    amount: z.number({ error: 'Số tiền không hợp lệ' }).positive('Số tiền phải lớn hơn 0'),
    method: z.enum(['Tiền mặt', 'Chuyển khoản'], { error: 'Phương thức không hợp lệ' }),
    bankAccountId: z.string().optional().nullable().default(null),
    cashFundId: z.string().optional().nullable().default(null),
    department: z.enum(DEPARTMENTS, { error: 'Phòng ban bắt buộc' }),
    debitAccountId: z.string().min(1, 'TK Nợ bắt buộc'),
    creditAccountId: z.string().min(1, 'TK Có bắt buộc'),
    documentNo: optStr,
    documentDate: optDate,
    attachments: z.array(attachmentSchema).optional().default([]),
    notes: optStr,
}).strict()
    .refine(d => d.method !== 'Chuyển khoản' || !!d.bankAccountId, {
        message: 'Tạm ứng chuyển khoản bắt buộc chọn tài khoản ngân hàng', path: ['bankAccountId'],
    })
    .refine(d => d.debitAccountId !== d.creditAccountId, {
        message: 'TK Nợ và TK Có không được trùng nhau', path: ['creditAccountId'],
    });

const settleTypeValues = SETTLE_TYPES.map(s => s.value);

export const advanceSettlementCreateSchema = z.object({
    settleType: z.enum(settleTypeValues, { error: 'Hình thức quyết toán không hợp lệ' }),
    amount: z.number({ error: 'Số tiền không hợp lệ' }).positive('Số tiền phải lớn hơn 0'),
    date: z.string().min(1, 'Ngày bắt buộc').transform(v => new Date(v)),
    // Chỉ bắt buộc khi settleType = cash_return (hoàn tiền mặt/CK cần biết TK Nợ/Có + phương thức
    // để tạo dòng Thu tương ứng trong Nhật ký).
    method: z.enum(['Tiền mặt', 'Chuyển khoản']).optional().nullable().default(null),
    bankAccountId: z.string().optional().nullable().default(null),
    cashFundId: z.string().optional().nullable().default(null),
    debitAccountId: z.string().optional().nullable().default(null),
    creditAccountId: z.string().optional().nullable().default(null),
    proofUrl: optStr,
    notes: optStr,
}).strict()
    .refine(d => d.settleType !== 'cash_return' || (!!d.method && !!d.debitAccountId && !!d.creditAccountId), {
        message: 'Hoàn tiền mặt/CK bắt buộc chọn phương thức và hạch toán TK Nợ/Có',
        path: ['method'],
    })
    .refine(d => d.settleType !== 'cash_return' || d.method !== 'Chuyển khoản' || !!d.bankAccountId, {
        message: 'Hoàn qua chuyển khoản bắt buộc chọn tài khoản ngân hàng', path: ['bankAccountId'],
    });
