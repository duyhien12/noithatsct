import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { mfgLogCreateSchema } from '@/lib/validations/manufacturing';
import { computeOrderProgressFromItems } from '@/lib/manufacturing/progress';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const mfgOrderId = searchParams.get('mfgOrderId');
    const mfgItemId = searchParams.get('mfgItemId');
    const workerId = searchParams.get('workerId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where = {};
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;
    if (mfgItemId) where.mfgItemId = mfgItemId;
    if (workerId) where.workerId = workerId;
    if (dateFrom || dateTo) {
        where.logDate = {};
        if (dateFrom) where.logDate.gte = new Date(dateFrom);
        if (dateTo) where.logDate.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
        prisma.mfgLog.findMany({
            where,
            include: {
                mfgOrder: { select: { id: true, code: true, project: { select: { code: true, name: true } } } },
                item: { select: { id: true, code: true, name: true } },
                worker: { select: { id: true, name: true } },
            },
            orderBy: { logDate: 'desc' },
            skip, take: limit,
        }),
        prisma.mfgLog.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(logs, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    let data;
    try {
        data = mfgLogCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const order = await prisma.mfgOrder.findFirst({ where: { id: data.mfgOrderId, deletedAt: null }, select: { id: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
        let progressBefore = 0;
        if (data.mfgItemId) {
            const item = await tx.mfgItem.findUnique({ where: { id: data.mfgItemId }, select: { progressPercent: true } });
            progressBefore = item?.progressPercent ?? 0;
        }
        const progressAfter = data.progressAfter !== undefined ? data.progressAfter : progressBefore;

        const log = await tx.mfgLog.create({
            data: {
                mfgOrderId: data.mfgOrderId,
                mfgItemId: data.mfgItemId || null,
                mfgItemStageId: data.mfgItemStageId || null,
                taskId: data.taskId || null,
                logDate: data.logDate || new Date(),
                workerId: data.workerId || null,
                teamName: data.teamName || '',
                workDescription: data.workDescription || '',
                completedQuantity: data.completedQuantity || 0,
                workHours: data.workHours || 0,
                progressBefore,
                progressAfter,
                issueDescription: data.issueDescription || '',
                nextPlan: data.nextPlan || '',
                createdById: session.user.id,
            },
        });

        if (data.images?.length) {
            await tx.mfgAttachment.createMany({
                data: data.images.map(url => ({
                    entityType: 'MfgLog', entityId: log.id, url,
                    uploadedById: session.user.id, uploadedByName: session.user.name || '',
                })),
            });
        }

        if (data.mfgItemStageId && data.workHours) {
            await tx.mfgItemStage.update({ where: { id: data.mfgItemStageId }, data: { actualHours: { increment: data.workHours } } });
        }
        if (data.taskId && data.workHours) {
            await tx.mfgTask.update({ where: { id: data.taskId }, data: { actualHours: { increment: data.workHours } } });
        }
        if (data.mfgItemId && data.progressAfter !== undefined) {
            await tx.mfgItem.update({ where: { id: data.mfgItemId }, data: { progressPercent: progressAfter } });
            const orderItems = await tx.mfgItem.findMany({ where: { mfgOrderId: data.mfgOrderId }, select: { status: true, progressPercent: true } });
            await tx.mfgOrder.update({ where: { id: data.mfgOrderId }, data: { progressPercent: computeOrderProgressFromItems(orderItems) } });
        }

        return log;
    });

    return NextResponse.json(result, { status: 201 });
});
