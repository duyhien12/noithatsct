import { z } from 'zod';
import { optStr, optFloat, optInt } from './common';

export const productCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên sản phẩm bắt buộc'),
    category: z.string().trim().min(1, 'Danh mục bắt buộc'),
    unit: z.string().trim().min(1, 'Đơn vị bắt buộc'),
    importPrice: optFloat,
    salePrice: optFloat,
    stock: optInt,
    minStock: optInt,
    supplier: optStr,
    description: optStr,
    dimensions: optStr,
    weight: optFloat,
    color: optStr,
    material: optStr,
    origin: optStr,
    warranty: optStr,
    brand: optStr,
    status: optStr.default('Đang bán'),
    supplyType: optStr.default('Vật tư lưu kho'),
    leadTimeDays: optInt,
    location: optStr,
    image: optStr,
    coreBoard: optStr,
    surfaceCode: optStr,
    categoryId: z.string().optional().nullable().default(null),
}).strict();

export const productUpdateSchema = productCreateSchema.partial();
