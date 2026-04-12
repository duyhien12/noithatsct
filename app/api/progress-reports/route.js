import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { progressReportCreateSchema } from '@/lib/validations/progressReport';
import { recalcParentProgress, recalcProjectProgress } from '@/lib/scheduleUtils';
import { notifyProgressUpdated } from '@/lib/notify';

/**
 * GET /api/progress-reports?taskId=xxx
 * List progress reports for a task (newest first)
 */
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (taskId) where.taskId = taskId;
    if (projectId) where.projectId = projectId;

    const reports = await prisma.progressReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reports);
});

/**
 * POST /api/progress-reports
 * Create progress report with mandatory photos
 * Auto-update ScheduleTask.progress + auto-create TrackingLog
 */
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = progressReportCreateSchema.parse(body);
    const userName = request.headers.get('x-user-name') || 'Giám sát';

    // Fetch current task
    const task = await prisma.scheduleTask.findUnique({ where: { id: data.taskId } });
    if (!task) return NextResponse.json({ error: 'Hạng mục không tồn tại' }, { status: 404 });

    // Rule: Task locked (100% đã hoàn thành)
    if (task.isLocked) {
        return NextResponse.json({ error: 'Hạng mục đã hoàn thành và bị khóa' }, { status: 400 });
    }

    // Rule 1: Tiến độ không lùi
    if (data.progressTo < task.progress) {
        return NextResponse.json({
            error: `Tiến độ mới (${data.progressTo}%) không được nhỏ hơn tiến độ hiện tại (${task.progress}%)`,
        }, { status: 400 });
    }

    // Auto-set status
    let newStatus = 'Chưa bắt đầu';
    if (data.progressTo === 100) newStatus = 'Hoàn thành';
    else if (data.progressTo > 0) newStatus = 'Đang thi công';

    const isCompleting = data.progressTo === 100;

    const result = await prisma.$transaction(async (tx) => {
        // 1. Create ProgressReport
        const report = await tx.progressReport.create({
            data: {
                progressFrom: task.progress,
                progressTo: data.progressTo,
                description: data.description,
                images: JSON.stringify(data.images),
                reportDate: data.reportDate ? new Date(data.reportDate) : new Date(),
                createdBy: userName,
                taskId: data.taskId,
                projectId: data.projectId,
            },
        });

        // 2. Update task progress + status
        const updateData = {
            progress: data.progressTo,
            status: newStatus,
        };
        if (isCompleting) updateData.isLocked = true;

        await tx.scheduleTask.update({
            where: { id: data.taskId },
            data: updateData,
        });

        // 3. Auto-create TrackingLog (sync nhật ký)
        const imgList = data.images.map((url, i) => `[Ảnh ${i + 1}](${url})`).join(' ');
        await tx.trackingLog.create({
            data: {
                content: `📊 Cập nhật tiến độ "${task.name}": ${task.progress}% → ${data.progressTo}%\n${data.description || ''}${imgList ? '\n' + imgList : ''}`,
                type: 'Tiến độ',
                createdBy: userName,
                projectId: data.projectId,
            },
        });

        return report;
    });

    // 4. Recalc parent + project progress (outside transaction for safety)
    if (task.parentId) await recalcParentProgress(task.parentId);
    await recalcProjectProgress(data.projectId);

    // 5. Thông báo Zalo cho quản lý
    const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        select: { code: true, name: true },
    });
    notifyProgressUpdated({
        taskName: task.name,
        projectCode: project?.code,
        projectName: project?.name,
        progressFrom: task.progress,
        progressTo: data.progressTo,
        updatedBy: userName,
    }).catch(e => console.error('[progress-reports POST] notify lỗi:', e));

    // 5. If completing (100%), check for successor tasks to unlock
    if (isCompleting) {
        const successors = await prisma.scheduleTask.findMany({
            where: { predecessorId: data.taskId },
        });
        // Just mark them as ready (not locked, can start)
        if (successors.length > 0) {
            await prisma.scheduleTask.updateMany({
                where: { predecessorId: data.taskId, status: 'Chưa bắt đầu' },
                data: { status: 'Sẵn sàng' },
            });
        }
    }

    return NextResponse.json(result, { status: 201 });
});
