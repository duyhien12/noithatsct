import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { mfgTaskUpdateSchema } from '@/lib/validations/manufacturing';
import { writeAudit } from '@/lib/manufacturing/audit';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const task = await prisma.mfgTask.findUnique({
        where: { id },
        include: {
            mfgOrder: { select: { id: true, code: true, project: { select: { code: true, name: true } } } },
            item: { select: { id: true, code: true, name: true, drawingUrl: true, referenceImageUrl: true } },
            itemStage: { select: { id: true, name: true } },
            assignedWorker: { select: { id: true, name: true } },
        },
    });
    if (!task) return NextResponse.json({ error: 'Không tìm thấy phiếu giao việc' }, { status: 404 });
    return NextResponse.json(task);
});

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    let data;
    try {
        data = mfgTaskUpdateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const task = await prisma.mfgTask.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: 'Không tìm thấy phiếu giao việc' }, { status: 404 });

    const now = new Date();
    const fromStatus = task.status;
    const extra = {};
    if (data.status === 'IN_PROGRESS' && fromStatus !== 'IN_PROGRESS' && !task.startedAt) extra.startedAt = now;
    if (data.status === 'COMPLETED' && fromStatus !== 'COMPLETED') { extra.completedAt = now; extra.progressPercent = 100; }

    const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.mfgTask.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.assignedTeamName !== undefined && { assignedTeamName: data.assignedTeamName }),
                ...(data.assignedWorkerId !== undefined && { assignedWorkerId: data.assignedWorkerId || null }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.plannedStartDate !== undefined && { plannedStartDate: data.plannedStartDate }),
                ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
                ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
                ...(data.actualHours !== undefined && { actualHours: data.actualHours }),
                ...(data.progressPercent !== undefined && { progressPercent: data.progressPercent }),
                ...(data.note !== undefined && { note: data.note }),
                ...(data.status !== undefined && { status: data.status }),
                ...extra,
            },
        });
        if (data.status && data.status !== fromStatus) {
            await writeAudit(tx, { entityType: 'MfgTask', entityId: id, action: 'STATUS_CHANGE', fromStatus, toStatus: data.status, session });
        }
        return result;
    });

    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const task = await prisma.mfgTask.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: 'Không tìm thấy phiếu giao việc' }, { status: 404 });
    await prisma.$transaction(async (tx) => {
        await tx.mfgTask.delete({ where: { id } });
        await writeAudit(tx, { entityType: 'MfgTask', entityId: id, action: 'DELETE', fromStatus: task.status, session });
    });
    return NextResponse.json({ ok: true });
});
