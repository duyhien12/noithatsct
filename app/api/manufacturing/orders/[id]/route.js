import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { mfgOrderUpdateSchema } from '@/lib/validations/manufacturing';
import { orderHasDependentRecords } from '@/lib/manufacturing/workflow';
import { writeAudit } from '@/lib/manufacturing/audit';
import { computeOrderProgressFromItems, isOrderLate, daysLate } from '@/lib/manufacturing/progress';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.mfgOrder.findFirst({
        where: { id, deletedAt: null },
        include: {
            project: { select: { id: true, code: true, name: true, address: true } },
            contract: { select: { id: true, code: true, name: true } },
            items: {
                orderBy: { createdAt: 'asc' },
                include: {
                    stages: { orderBy: { sequence: 'asc' } },
                    assignedWorker: { select: { id: true, name: true } },
                    _count: { select: { qualityIssues: true } },
                },
            },
            materialReqs: { orderBy: { createdAt: 'asc' } },
            qualityInspections: { orderBy: { inspectedAt: 'desc' } },
            qualityIssues: { orderBy: { reportedAt: 'desc' } },
            packingRecords: { include: { items: { include: { item: { select: { id: true, code: true, name: true } } } } } },
            deliveryRecords: { include: { items: true } },
        },
    });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    const auditLog = await prisma.mfgAuditLog.findMany({
        where: { entityType: 'MfgOrder', entityId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return NextResponse.json({
        ...order,
        isLate: isOrderLate(order),
        daysLate: daysLate(order),
        computedProgress: computeOrderProgressFromItems(order.items),
        auditLog,
    });
});

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    let data;
    try {
        data = mfgOrderUpdateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const existing = await prisma.mfgOrder.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });
    if (['COMPLETED', 'CANCELLED'].includes(existing.status)) {
        return NextResponse.json({ error: `Lệnh đã "${existing.status}" — không thể chỉnh sửa` }, { status: 409 });
    }

    const order = await prisma.mfgOrder.update({
        where: { id },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.batchNumber !== undefined && { batchNumber: data.batchNumber }),
            ...(data.priority !== undefined && { priority: data.priority }),
            ...(data.plannedStartDate !== undefined && { plannedStartDate: data.plannedStartDate }),
            ...(data.plannedEndDate !== undefined && { plannedEndDate: data.plannedEndDate }),
            ...(data.productionManagerId !== undefined && { productionManagerId: data.productionManagerId }),
            ...(data.qcManagerId !== undefined && { qcManagerId: data.qcManagerId }),
            ...(data.note !== undefined && { note: data.note }),
            updatedById: session.user.id,
        },
        include: { project: { select: { code: true, name: true } } },
    });
    return NextResponse.json(order);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const order = await prisma.mfgOrder.findFirst({ where: { id, deletedAt: null } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    const hasDependents = await orderHasDependentRecords(prisma, id);
    if (hasDependents) {
        return NextResponse.json({
            error: 'Lệnh đã phát sinh QC/vật tư/đóng gói/vận chuyển — không thể xóa, chỉ có thể hủy (dùng thao tác Hủy lệnh)',
        }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
        await tx.mfgOrder.delete({ where: { id } }); // soft delete qua Prisma extension
        await writeAudit(tx, { entityType: 'MfgOrder', entityId: id, action: 'DELETE', fromStatus: order.status, session });
    });
    return NextResponse.json({ ok: true });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd', 'xuong'] });
