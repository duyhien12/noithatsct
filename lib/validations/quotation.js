import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

const quotationItemSchema = z.object({
    name: z.string().default(''),
    order: z.number().int().optional(),
    unit: optStr,
    quantity: optFloat,
    mainMaterial: optFloat,
    auxMaterial: optFloat,
    labor: optFloat,
    unitPrice: optFloat,
    amount: optFloat,
    description: optStr,
    length: optFloat,
    width: optFloat,
    height: optFloat,
    image: optStr,
    productId: z.string().optional().nullable().default(null),
});

const quotationCategorySchema = z.object({
    name: z.string().default(''),
    group: z.string().default(''),
    image: optStr,
    subtotal: optFloat,
    items: z.array(quotationItemSchema).default([]),
});

export const quotationCreateSchema = z.object({
    customerId: z.string().min(1, 'Khách hàng bắt buộc'),
    projectId: z.string().optional().nullable().default(null),
    type: optStr.default('Thi công'),
    notes: optStr,
    status: optStr.default('Nháp'),
    validUntil: optDate,
    vat: optFloat.default(10),
    discount: optFloat,
    managementFeeRate: optFloat.default(5),
    managementFee: optFloat,
    designFee: optFloat,
    otherFee: optFloat,
    adjustment: optFloat,
    adjustmentType: optStr.default('amount'),
    adjustmentAmount: optFloat,
    directCost: optFloat,
    total: optFloat,
    grandTotal: optFloat,
    categories: z.array(quotationCategorySchema).optional(),
}).strict();

export const quotationUpdateSchema = quotationCreateSchema.partial();
