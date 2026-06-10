import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId   = searchParams.get('projectId');
    const status      = searchParams.get('status');
    const projectType = searchParams.get('projectType');
    const dept        = searchParams.get('dept');

    const where = {};
    if (projectId) where.projectId = projectId;
    if (status)    where.status = status;
    if (dept === 'thiet_ke') {
        where.project = { type: { in: ['Thiết kế kiến trúc', 'Thiết kế nội thất'] }, deletedAt: null };
    } else if (projectType) {
        where.project = { type: projectType, deletedAt: null };
    } else {
        where.project = { deletedAt: null };
    }

    const tasks = await prisma.scheduleTask.findMany({
        where,
        orderBy: [{ projectId: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
        include: {
            project: { select: { id: true, code: true, name: true, type: true } },
        },
    });

    return NextResponse.json(tasks);
});
