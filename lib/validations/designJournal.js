import { z } from 'zod';
import { optStr, optDate, optStrPatch, optDatePatch } from './common';
import { JOURNAL_STATUSES, DEFAULT_JOURNAL_STATUS } from '@/lib/designJournalStatus';

const status = z.enum(JOURNAL_STATUSES, { message: 'Đánh giá không hợp lệ' });

export const designJournalCreateSchema = z.object({
    content: z.string().trim().min(1, 'Nội dung công việc bắt buộc'),
    projectName: optStr,
    executorName: optStr,
    duration: optStr,
    startDate: optDate,
    endDate: optDate,
    status: status.optional().default(DEFAULT_JOURNAL_STATUS),
}).strict();

export const designJournalUpdateSchema = z.object({
    content: optStrPatch,
    projectName: optStrPatch,
    executorName: optStrPatch,
    duration: optStrPatch,
    startDate: optDatePatch,
    endDate: optDatePatch,
    status: status.optional(),
}).strict().partial();
