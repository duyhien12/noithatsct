import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { mfgItemStageUpdateSchema } from '@/lib/validations/manufacturing';
import { writeAudit } from '@/lib/manufacturing/audit';
import { computeItemProgressFromStages, computeOrderProgressFromItems } from '@/lib/manufacturing/progress';

// Cập nhật 1 công đoạn thực tế + cascade: mở công đoạn kế tiếp, cập nhật tiến độ sản phẩm/lệnh (mục VI.6)
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    let data;
    try {
        data = mfgItemStageUpdateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const stage = await prisma.mfgItemStage.findUnique({ where: { id } });
    if (!stage) return NextResponse.json({ error: 'Không tìm thấy công đoạn' }, { status: 404 });

    const now = new Date();
    const fromStatus = stage.status;
    const toStatus = data.status || stage.status;
    const stageData = {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.progressPercent !== undefined && { progressPercent: data.progressPercent }),
        ...(data.assignedTeamName !== undefined && { assignedTeamName: data.assignedTeamName }),
        ...(data.assignedWorkerId !== undefined && { assignedWorkerId: data.assignedWorkerId || null }),
        ...(data.plannedStartDate !== undefined && { plannedStartDate: data.plannedStartDate }),
        ...(data.plannedEndDate !== undefined && { plannedEndDate: data.plannedEndDate }),
        ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
        ...(data.actualHours !== undefined && { actualHours: data.actualHours }),
        ...(data.note !== undefined && { note: data.note }),
    };

    if (toStatus === 'IN_PROGRESS' && fromStatus !== 'IN_PROGRESS' && !stage.actualStartDate) {
        stageData.actualStartDate = now;
    }
    if (toStatus === 'COMPLETED' && fromStatus !== 'COMPLETED') {
        stageData.actualEndDate = now;
        stageData.completedById = session.user.id;
        stageData.completedAt = now;
        stageData.progressPercent = 100;
    }

    const result = await prisma.$transaction(async (tx) => {
        const updatedStage = await tx.mfgItemStage.update({ where: { id }, data: stageData });

        // Mở công đoạn kế tiếp khi công đoạn này hoàn thành
        if (toStatus === 'COMPLETED' && fromStatus !== 'COMPLETED') {
            const next = await tx.mfgItemStage.findFirst({
                where: { mfgItemId: stage.mfgItemId, sequence: { gt: stage.sequence }, status: 'NOT_STARTED' },
                orderBy: { sequence: 'asc' },
            });
            if (next) await tx.mfgItemStage.update({ where: { id: next.id }, data: { status: 'READY' } });
        }

        // Cập nhật tiến độ + trạng thái sản phẩm
        const allStages = await tx.mfgItemStage.findMany({ where: { mfgItemId: stage.mfgItemId } });
        const item = await tx.mfgItem.findUnique({ where: { id: stage.mfgItemId } });
        const itemProgress = computeItemProgressFromStages(allStages);
        const activeStages = allStages.filter(s => s.status !== 'CANCELLED');
        const allCompleted = activeStages.length > 0 && activeStages.every(s => s.status === 'COMPLETED');

        let newItemStatus = item.status;
        if (toStatus === 'IN_PROGRESS' && ['NOT_STARTED', 'WAITING_DRAWING', 'WAITING_MATERIAL', 'READY'].includes(item.status)) {
            newItemStatus = 'IN_PROGRESS';
        }
        if (allCompleted && !['WAITING_QC', 'REWORK', 'PASSED_QC', 'PACKED', 'DELIVERED', 'INSTALLED', 'COMPLETED', 'CANCELLED'].includes(item.status)) {
            newItemStatus = 'WAITING_QC';
        }

        const updatedItem = await tx.mfgItem.update({
            where: { id: stage.mfgItemId },
            data: {
                progressPercent: itemProgress,
                status: newItemStatus,
                actualStartDate: (newItemStatus === 'IN_PROGRESS' && !item.actualStartDate) ? now : undefined,
            },
        });

        // Cập nhật tiến độ lệnh sản xuất (cache trên MfgOrder.progressPercent)
        const orderItems = await tx.mfgItem.findMany({ where: { mfgOrderId: item.mfgOrderId }, select: { status: true, progressPercent: true } });
        const orderProgress = computeOrderProgressFromItems(orderItems);
        await tx.mfgOrder.update({ where: { id: item.mfgOrderId }, data: { progressPercent: orderProgress } });

        await writeAudit(tx, {
            entityType: 'MfgItemStage', entityId: id, action: 'STATUS_CHANGE',
            fromStatus, toStatus, session,
        });

        return { stage: updatedStage, item: updatedItem, itemProgress, orderProgress };
    });

    return NextResponse.json(result);
});
