import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/field/project-tasks?projectId=xxx
 * Returns all schedule tasks for a project (flat list) for field workers to browse.
 */
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const tasks = await prisma.scheduleTask.findMany({
        where: { projectId, isLocked: false },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: {
            id: true, name: true, progress: true, status: true,
            startDate: true, endDate: true, assignee: true,
            level: true, wbs: true, parentId: true,
        },
    });

    return NextResponse.json(tasks);
});
