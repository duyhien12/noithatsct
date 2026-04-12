import { z } from 'zod';

export const progressReportCreateSchema = z.object({
    taskId: z.string().min(1, 'Hạng mục bắt buộc'),
    projectId: z.string().min(1, 'Dự án bắt buộc'),
    progressTo: z.number().int().min(0).max(100),
    description: z.string().optional().default(''),
    images: z.array(z.string().url()).min(1, 'Bắt buộc đính kèm ít nhất 1 ảnh hiện trường'),
    reportDate: z.string().optional(),
});

export const progressReportReviewSchema = z.object({
    status: z.enum(['Đã duyệt', 'Từ chối']),
    rejectionNote: z.string().optional().default(''),
});
