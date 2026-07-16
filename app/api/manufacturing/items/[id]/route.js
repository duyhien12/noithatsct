import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { mfgItemUpdateSchema } from '@/lib/validations/manufacturing';
import { writeAudit } from '@/lib/manufacturing/audit';
import { computeItemProgressFromStages } from '@/lib/manufacturing/progress';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const item = await prisma.mfgItem.findUnique({
        where: { id },
        include: {
            mfgOrder: { select: { id: true, code: true, status: true, projectId: true } },
            project: { select: { id: true, code: true, name: true } },
            assignedWorker: { select: { id: true, name: true, skill: true, phone: true } },
            stages: { orderBy: { sequence: 'asc' }, include: { assignedWorker: { select: { id: true, name: true } } } },
            tasks: { orderBy: { createdAt: 'desc' } },
            logs: { orderBy: { logDate: 'desc' }, take: 50 },
            materialReqs: true,
            qualityInspections: { orderBy: { inspectedAt: 'desc' } },
            qualityIssues: { orderBy: { reportedAt: 'desc' } },
            packingItems: { include: { packingRecord: { select: { id: true, code: true, status: true } } } },
        },
    });
    if (!item) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });

    const attachments = await prisma.mfgAttachment.findMany({
        where: { entityType: 'MfgItem', entityId: id },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ...item, computedProgress: computeItemProgressFromStages(item.stages), attachments });
});

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    let data;
    try {
        data = mfgItemUpdateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const existing = await prisma.mfgItem.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });

    const item = await prisma.mfgItem.update({
        where: { id },
        data: { ...data, updatedById: session.user.id },
    });
    return NextResponse.json(item);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const item = await prisma.mfgItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });

    const [qc, pack, deliver] = await Promise.all([
        prisma.qualityInspection.count({ where: { mfgItemId: id } }),
        prisma.packingItem.count({ where: { mfgItemId: id } }),
        prisma.deliveryItem.count({ where: { mfgItemId: id } }),
    ]);
    if (qc + pack + deliver > 0) {
        return NextResponse.json({ error: 'Sản phẩm đã phát sinh QC/đóng gói/vận chuyển — không thể xóa, chỉ có thể hủy' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
        await tx.mfgItemStage.deleteMany({ where: { mfgItemId: id } });
        await tx.mfgItem.delete({ where: { id } });
        await writeAudit(tx, { entityType: 'MfgItem', entityId: id, action: 'DELETE', fromStatus: item.status, session });
    });
    return NextResponse.json({ ok: true });
});
