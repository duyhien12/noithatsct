import { z } from 'zod';
import { optStr, optInt } from './common';

export const categoryCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên danh mục bắt buộc'),
    slug: optStr,
    order: optInt,
    parentId: z.string().optional().nullable().default(null),
}).strict();

export const categoryUpdateSchema = categoryCreateSchema.partial();
