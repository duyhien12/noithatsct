import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

export const employeeCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên nhân viên bắt buộc'),
    departmentId: z.string().min(1, 'Phòng ban bắt buộc'),
    position: optStr,
    phone: optStr,
    email: optStr,
    salary: optFloat,
    status: optStr.default('Đang làm'),
    joinDate: optDate,
    birthDate: optDate,
}).strict();

export const employeeUpdateSchema = employeeCreateSchema.partial();
