import { z } from 'zod';
import { optStr, cuid } from './common';

const DOCUMENT_STATUSES = ['Nháp', 'Chờ duyệt', 'Đã duyệt', 'Phát hành'];
const FOLDER_VISIBILITY = ['internal', 'subcontractor', 'client'];

export const documentCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên tài liệu bắt buộc'),
    fileUrl: optStr,
    fileName: optStr,
    fileSize: z.number().int().optional().default(0),
    mimeType: optStr,
    thumbnailUrl: optStr,
    space: optStr,
    category: optStr.default('Khác'),
    status: z.enum(DOCUMENT_STATUSES).optional().default('Nháp'),
    notes: optStr,
    folderId: z.string().optional().nullable(),
    projectId: z.string().min(1, 'Dự án bắt buộc'),
    customerId: z.string().optional().nullable(),
    parentDocumentId: z.string().optional().nullable(),
}).strict();

export const documentUpdateSchema = z.object({
    name: z.string().trim().min(1).optional(),
    notes: z.string().trim().optional(),
    status: z.enum(DOCUMENT_STATUSES).optional(),
    folderId: z.string().optional().nullable(),
    category: z.string().trim().optional(),
}).strict();

export const folderCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên thư mục bắt buộc'),
    projectId: z.string().min(1, 'Dự án bắt buộc'),
    parentId: z.string().optional().nullable(),
    order: z.number().int().optional().default(0),
}).strict();

export const folderUpdateSchema = z.object({
    name: z.string().trim().min(1).optional(),
    order: z.number().int().optional(),
}).strict();
