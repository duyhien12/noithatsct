import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

const purchaseOrderItemSchema = z.object({
    productName: z.string().trim().min(1, 'Tên sản phẩm bắt buộc'),
    unit: optStr,
    quantity: optFloat,
    unitPrice: optFloat,
    amount: optFloat,
    receivedQty: optFloat,
    notes: optStr,
    productId: z.string().optional().nullable().default(null),
    materialPlanId: z.string().optional().nullable().default(null),
});

export const purchaseOrderCreateSchema = z.object({
    supplier: z.string().trim().min(1, 'Nhà cung cấp bắt buộc'),
    supplierId: z.string().optional().nullable().default(null),
    totalAmount: optFloat,
    paidAmount: optFloat,
    status: optStr.default('Nháp'),
    orderDate: optDate,
    deliveryDate: optDate,
    receivedDate: optDate,
    deliveryType: optStr,
    deliveryAddress: optStr,
    notes: optStr,
    projectId: z.string().optional().nullable().default(null),
    items: z.array(purchaseOrderItemSchema).optional(),
});

export const purchaseOrderUpdateSchema = purchaseOrderCreateSchema.partial();
