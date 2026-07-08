import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

const designOrderItemSchema = z.object({
    name: z.string().trim().min(1, 'Tên hạng mục bắt buộc'),
    unit: optStr,
    quantity: z.number().min(0, 'Khối lượng phải >= 0').optional().default(0),
    unitPrice: z.number().min(0, 'Đơn giá phải >= 0').optional().default(0),
    note: optStr,
});

export const designOrderCreateSchema = z.object({
    customerId: z.string().min(1, 'Khách hàng bắt buộc'),
    projectId: z.string().optional().nullable().default(null),
    customerName: optStr,
    customerPhone: optStr,
    siteAddress: z.string().trim().min(1, 'Địa chỉ công trình bắt buộc'),
    projectType: optStr.default('Nhà phố'),
    designArea: optFloat,
    designStyle: optStr,
    requirementLevel: optStr.default('Tiêu chuẩn'),
    deadline: z.string().min(1, 'Deadline bắt buộc').transform(v => new Date(v)),
    notes: optStr,
    attachments: z.array(z.object({
        url: z.string(),
        name: z.string().optional().default(''),
        type: z.string().optional().default(''),
    })).optional().default([]),
    discount: optFloat,
    discountType: z.enum(['amount', 'percent']).optional().default('amount'),
    vatRate: optFloat,
    items: z.array(designOrderItemSchema).min(1, 'Cần ít nhất 1 hạng mục'),
}).strict();

// PUT thay thế toàn bộ phiếu (kể cả hạng mục) nên giữ nguyên các ràng buộc bắt buộc như khi tạo mới.
export const designOrderUpdateSchema = designOrderCreateSchema;
