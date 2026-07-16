import { z } from 'zod';
import { optStr, optDate, cuid } from './common';

export const mfgOrderCreateSchema = z.object({
    projectId: z.string().min(1, 'Dự án bắt buộc'),
    contractId: cuid,
    title: z.string().trim().min(1, 'Tiêu đề bắt buộc'),
    description: optStr,
    batchNumber: optStr,
    priority: optStr.default('NORMAL'),
    plannedStartDate: optDate,
    plannedEndDate: optDate,
    productionManagerId: optStr,
    qcManagerId: optStr,
    note: optStr,
}).strict();

export const mfgOrderUpdateSchema = mfgOrderCreateSchema.partial();

export const mfgItemCreateSchema = z.object({
    mfgOrderId: z.string().min(1),
    name: z.string().trim().min(1, 'Tên sản phẩm bắt buộc'),
    category: optStr,
    floorName: optStr,
    roomName: optStr,
    quantity: z.number().positive().default(1),
    unit: optStr.default('cái'),
    length: z.number().optional().default(0),
    width: z.number().optional().default(0),
    height: z.number().optional().default(0),
    materialDescription: optStr,
    colorDescription: optStr,
    hardwareDescription: optStr,
    drawingDocumentId: cuid,
    drawingUrl: optStr,
    referenceImageUrl: optStr,
    plannedStartDate: optDate,
    plannedEndDate: optDate,
    assignedTeamName: optStr,
    assignedWorkerId: cuid,
    priority: optStr.default('NORMAL'),
    note: optStr,
    stageTemplateIds: z.array(z.string()).optional(), // áp dụng quy trình công đoạn khi tạo
}).strict();

export const mfgItemUpdateSchema = mfgItemCreateSchema.partial().omit({ mfgOrderId: true, stageTemplateIds: true });

export const mfgItemStageUpdateSchema = z.object({
    status: optStr,
    progressPercent: z.number().int().min(0).max(100).optional(),
    assignedTeamName: optStr,
    assignedWorkerId: cuid,
    plannedStartDate: optDate,
    plannedEndDate: optDate,
    estimatedHours: z.number().optional(),
    actualHours: z.number().optional(),
    note: optStr,
}).strict();

export const mfgTaskCreateSchema = z.object({
    mfgOrderId: z.string().min(1),
    mfgItemId: cuid,
    mfgItemStageId: cuid,
    title: z.string().trim().min(1),
    description: optStr,
    assignedTeamName: optStr,
    assignedWorkerId: cuid,
    priority: optStr.default('NORMAL'),
    plannedStartDate: optDate,
    dueDate: optDate,
    estimatedHours: z.number().optional().default(0),
    note: optStr,
}).strict();

export const mfgTaskUpdateSchema = mfgTaskCreateSchema.partial().omit({ mfgOrderId: true }).extend({
    status: optStr,
    actualHours: z.number().optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
});

export const mfgLogCreateSchema = z.object({
    mfgOrderId: z.string().min(1),
    mfgItemId: cuid,
    mfgItemStageId: cuid,
    taskId: cuid,
    logDate: optDate,
    workerId: cuid,
    teamName: optStr,
    workDescription: optStr,
    completedQuantity: z.number().optional().default(0),
    workHours: z.number().optional().default(0),
    progressAfter: z.number().int().min(0).max(100).optional(),
    issueDescription: optStr,
    nextPlan: optStr,
    images: z.array(z.string()).optional().default([]),
}).strict();

export const mfgMaterialReqCreateSchema = z.object({
    mfgOrderId: z.string().min(1),
    mfgItemId: cuid,
    productId: cuid,
    materialName: optStr,
    specification: optStr,
    unit: optStr,
    estimatedQuantity: z.number().optional().default(0),
    estimatedUnitPrice: z.number().optional().default(0),
    requiredDate: optDate,
    note: optStr,
}).strict();

export const mfgMaterialReqUpdateSchema = z.object({
    status: optStr,
    issuedQuantity: z.number().optional(),
    usedQuantity: z.number().optional(),
    returnedQuantity: z.number().optional(),
    missingQuantity: z.number().optional(),
    actualUnitPrice: z.number().optional(),
    note: optStr,
}).strict();

export const qualityInspectionCreateSchema = z.object({
    mfgOrderId: z.string().min(1),
    mfgItemId: cuid,
    inspectionType: optStr.default('IN_PROCESS'),
    inspectedAt: optDate,
    dimensionPassed: z.boolean().default(true),
    materialPassed: z.boolean().default(true),
    colorPassed: z.boolean().default(true),
    hardwarePassed: z.boolean().default(true),
    surfacePassed: z.boolean().default(true),
    edgePassed: z.boolean().default(true),
    structurePassed: z.boolean().default(true),
    assemblyPassed: z.boolean().default(true),
    cleanlinessPassed: z.boolean().default(true),
    packingPassed: z.boolean().default(true),
    overallNote: optStr,
}).strict();

export const qualityIssueCreateSchema = z.object({
    mfgOrderId: z.string().min(1),
    mfgItemId: cuid,
    mfgItemStageId: cuid,
    qualityInspectionId: cuid,
    title: z.string().trim().min(1),
    description: z.string().trim().min(1, 'Bắt buộc mô tả lỗi'),
    severity: z.enum(['MINOR', 'NORMAL', 'MAJOR', 'CRITICAL']).default('NORMAL'),
    causeType: optStr,
    responsibleTeamName: optStr,
    responsibleWorkerId: cuid,
    dueDate: optDate,
    photos: z.array(z.string()).optional().default([]),
}).strict().superRefine((data, ctx) => {
    if (['MAJOR', 'CRITICAL'].includes(data.severity) && (!data.photos || data.photos.length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['photos'], message: 'Lỗi MAJOR/CRITICAL bắt buộc có ít nhất 1 ảnh' });
    }
});

export const qualityIssueUpdateSchema = z.object({
    status: optStr,
    correctiveAction: optStr,
    repairCost: z.number().optional(),
    note: optStr,
}).strict();

export const packingRecordCreateSchema = z.object({
    mfgOrderId: z.string().min(1),
    packageType: optStr,
    note: optStr,
    items: z.array(z.object({ mfgItemId: z.string(), quantity: z.number().positive() })).min(1, 'Cần ít nhất 1 sản phẩm để đóng gói'),
}).strict();

export const deliveryRecordCreateSchema = z.object({
    mfgOrderId: z.string().min(1),
    deliveryDate: optDate,
    vehicleNumber: optStr,
    driverName: optStr,
    driverPhone: optStr,
    carrierName: optStr,
    deliveryContactName: optStr,
    deliveryContactPhone: optStr,
    note: optStr,
    items: z.array(z.object({ packingRecordId: cuid, mfgItemId: cuid, quantity: z.number().positive() })).min(1, 'Cần ít nhất 1 kiện/sản phẩm để giao'),
}).strict();
