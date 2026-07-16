import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/field/mfg-tasks — Phiếu giao việc sản xuất của thợ/tổ trưởng hiện tại (mục X).
 * Khớp theo tên (WorkshopWorker.name === session.user.name), giống pattern /api/field/my-tasks.
 */
export const GET = withAuth(async (request, _ctx, session) => {
    const userName = session.user.name;
    const worker = await prisma.workshopWorker.findFirst({ where: { name: userName } });
    if (!worker) return NextResponse.json({ tasks: [], worker: null });

    const tasks = await prisma.mfgTask.findMany({
        where: { assignedWorkerId: worker.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        include: {
            mfgOrder: { select: { id: true, code: true, project: { select: { code: true, name: true } } } },
            item: { select: { id: true, code: true, name: true, drawingUrl: true, referenceImageUrl: true } },
            itemStage: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });

    return NextResponse.json({ tasks, worker: { id: worker.id, name: worker.name } });
});
