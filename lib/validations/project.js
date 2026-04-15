import { z } from 'zod';
import { optStr, optFloat, optInt, optDate } from './common';

export const projectCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên dự án bắt buộc'),
    type: z.string().trim().min(1, 'Loại dự án bắt buộc'),
    customerId: z.string().min(1, 'Khách hàng bắt buộc'),
    address: optStr,
    description: optStr,
    area: optFloat,
    floors: optInt,
    budget: optFloat,
    status: optStr.default('Khảo sát'),
    phase: optStr,
    startDate: optDate,
    endDate: optDate,
    manager: optStr,
    designer: optStr,
    supervisor: optStr,
    notes: optStr,
    createdByRole: optStr,
}).strict();

export const projectUpdateSchema = projectCreateSchema.partial();
