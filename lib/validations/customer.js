import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

export const customerCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên khách hàng bắt buộc'),
    phone: z.string().trim().min(1, 'Số điện thoại bắt buộc'),
    email: optStr,
    address: optStr,
    type: optStr.default('Cá nhân'),
    status: optStr.default('Lead'),
    taxCode: optStr,
    representative: optStr,
    birthday: optDate,
    source: optStr,
    notes: optStr,
    gender: optStr.default('Nam'),
    projectAddress: optStr,
    projectName: optStr,
    salesPerson: optStr,
    designer: optStr,
    contactPerson2: optStr,
    phone2: optStr,
    pipelineStage: optStr.default('Lead'),
    estimatedValue: optFloat,
    nextFollowUp: optDate,
    createdByRole: optStr,
}).strict();

export const customerUpdateSchema = customerCreateSchema.partial();
