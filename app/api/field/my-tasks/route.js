import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/field/my-tasks
 * Returns schedule tasks and work orders assigned to the current user.
 * Used by the mobile field app for workshop / site workers.
 */
export const GET = withAuth(async (request, _ctx, session) => {
    const userName = session.user.name;

    // Get active projects first
    const [scheduleTasks, workOrders] = await Promise.all([
        prisma.scheduleTask.findMany({
            where: {
                assignee: { contains: userName, mode: 'insensitive' },
                isLocked: false,
            },
            include: {
                project: {
                    select: { id: true, name: true, code: true, address: true, status: true },
                },
                progressReports: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { progressTo: true, reportDate: true, description: true },
                },
            },
            orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
        }),
        prisma.workOrder.findMany({
            where: {
                assignee: { contains: userName, mode: 'insensitive' },
                status: { not: 'Hoàn thành' },
                deletedAt: null,
            },
            include: {
                project: { select: { id: true, name: true, code: true, address: true } },
            },
            orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        }),
    ]);

    // Parse images in latest report
    const tasks = scheduleTasks.map(t => ({
        ...t,
        latestReport: t.progressReports[0] || null,
        progressReports: undefined,
    }));

    return NextResponse.json({ tasks, workOrders });
});
