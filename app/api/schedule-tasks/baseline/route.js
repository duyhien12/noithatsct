import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Snapshot current schedule as baseline.
 * Copies startDate→baselineStart, endDate→baselineEnd for all tasks in a project.
 */
export const POST = withAuth(async (request) => {
    const { projectId } = await request.json();
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const tasks = await prisma.scheduleTask.findMany({ where: { projectId } });

    await prisma.$transaction(
        tasks.map(t =>
            prisma.scheduleTask.update({
                where: { id: t.id },
                data: { baselineStart: t.startDate, baselineEnd: t.endDate },
            })
        )
    );

    return NextResponse.json({ count: tasks.length, message: 'Baseline saved' });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
