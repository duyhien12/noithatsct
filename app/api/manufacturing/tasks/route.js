import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { mfgTaskCreateSchema } from '@/lib/validations/manufacturing';
import { writeAudit } from '@/lib/manufacturing/audit';
import { notifyMfgTaskAssigned } from '@/lib/notify';

export const GET = withAuth(async (request, ctx, session) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const mfgOrderId = searchParams.get('mfgOrderId');
    const mfgItemId = searchParams.get('mfgItemId');
    const assignedWorkerId = searchParams.get('assignedWorkerId');
    const status = searchParams.get('status');
    const myTasksOnly = searchParams.get('myTasksOnly') === 'true';
    const overdueOnly = searchParams.get('overdueOnly') === 'true';

    const where = {};
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;
    if (mfgItemId) where.mfgItemId = mfgItemId;
    if (assignedWorkerId) where.assignedWorkerId = assignedWorkerId;
    if (status) where.status = status;
    if (overdueOnly) { where.dueDate = { lt: new Date() }; where.status = { notIn: ['COMPLETED', 'CANCELLED'] }; }
    if (myTasksOnly) {
        const worker = await prisma.workshopWorker.findFirst({ where: { name: session.user.name }, select: { id: true } });
        where.assignedWorkerId = worker?.id || '__none__';
    }

    const [tasks, total] = await Promise.all([
        prisma.mfgTask.findMany({
            where,
            include: {
                mfgOrder: { select: { id: true, code: true, project: { select: { code: true, name: true } } } },
                item: { select: { id: true, code: true, name: true } },
                assignedWorker: { select: { id: true, name: true } },
            },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
            skip, take: limit,
        }),
        prisma.mfgTask.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(tasks, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    let data;
    try {
        data = mfgTaskCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const order = await prisma.mfgOrder.findFirst({ where: { id: data.mfgOrderId, deletedAt: null }, select: { id: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const task = await withCodeRetry('mfgTask', `PGV-${yymm}-`, (code) => prisma.$transaction(async (tx) => {
        const created = await tx.mfgTask.create({
            data: {
                code,
                mfgOrderId: data.mfgOrderId,
                mfgItemId: data.mfgItemId || null,
                mfgItemStageId: data.mfgItemStageId || null,
                title: data.title,
                description: data.description || '',
                assignedTeamName: data.assignedTeamName || '',
                assignedWorkerId: data.assignedWorkerId || null,
                assignedById: session.user.id,
                priority: data.priority || 'NORMAL',
                plannedStartDate: data.plannedStartDate,
                dueDate: data.dueDate,
                estimatedHours: data.estimatedHours || 0,
                note: data.note || '',
            },
            include: { assignedWorker: { select: { id: true, name: true } } },
        });
        await writeAudit(tx, { entityType: 'MfgTask', entityId: created.id, action: 'CREATE', toStatus: 'NOT_STARTED', session });
        return created;
    }), 4);

    if (task.assignedWorker?.name) notifyMfgTaskAssigned(task).catch(() => {});

    return NextResponse.json(task, { status: 201 });
});
