import { z } from 'zod';
import { optStr } from './common';

export const loanContactCreateSchema = z.object({
    name: z.string().trim().min(1, 'Họ và tên bắt buộc'),
    phone: optStr,
    address: optStr,
    bankAccount: optStr,
    bankName: optStr,
    qrImage: optStr,
}).strict();

export const loanContactUpdateSchema = loanContactCreateSchema.partial();
