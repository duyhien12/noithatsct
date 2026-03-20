import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { progressReportReviewSchema } from '@/lib/validations/progressReport';
import { recalcParentProgress, recalcProjectProgress } from '@/lib/scheduleUtils';

/**
 * GET /api/progress-reports/[id]
 */
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const report = await prisma.progressReport.findUnique({ where: { id } });
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(report);
});

/**
 * PUT /api/progress-reports/[id]
 * PM approve or reject a progress report
 * If rejected: rollback task.progress to progressFrom
 */
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = progressReportReviewSchema.parse(body);

    const report = await prisma.progressReport.findUnique({ where: { id } });
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (report.status !== 'Đã duyệt' && report.status !== 'Chờ duyệt') {
        return NextResponse.json({ error: 'Báo cáo đã được xử lý' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
        // Update report status
        await tx.progressReport.update({
            where: { id },
            data: {
                status: data.status,
                rejectionNote: data.rejectionNote || '',
            },
        });

        if (data.status === 'Từ chối') {
            // Rollback task progress to progressFrom
            const newStatus = report.progressFrom === 0 ? 'Chưa bắt đầu'
                : report.progressFrom === 100 ? 'Hoàn thành' : 'Đang thi công';

            await tx.scheduleTask.update({
                where: { id: report.taskId },
                data: {
                    progress: report.progressFrom,
                    status: newStatus,
                    isLocked: false, // Unlock if was completed
                },
            });

            // Add tracking log for rejection
            await tx.trackingLog.create({
                data: {
                    content: `❌ PM từ chối báo cáo tiến độ: rollback ${report.progressTo}% → ${report.progressFrom}%${data.rejectionNote ? '\nLý do: ' + data.rejectionNote : ''}`,
                    type: 'Tiến độ',
                    createdBy: 'PM',
                    projectId: report.projectId,
                },
            });
        }
    });

    // Recalc after rejection
    if (data.status === 'Từ chối') {
        const task = await prisma.scheduleTask.findUnique({ where: { id: report.taskId } });
        if (task?.parentId) await recalcParentProgress(task.parentId);
        await recalcProjectProgress(report.projectId);
    }

    return NextResponse.json({ success: true });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
