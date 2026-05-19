import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const STATUS_TIMESTAMPS = {
    'Đang xử lý': 'startedAt',
    'Hoàn thành':  'completedDate',
    'Đã đánh giá': 'ratedAt',
};

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const record = await prisma.maintenanceRecord.findFirst({
        where: { id, deletedAt: null },
        include: { project: { select: { name: true, code: true, address: true, status: true } } },
    });
    if (!record) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Attach parent record summary if repeat
    let parentRecord = null;
    if (record.parentIssueId) {
        parentRecord = await prisma.maintenanceRecord.findFirst({
            where: { id: record.parentIssueId },
            select: { id: true, code: true, title: true, completedDate: true },
        });
    }

    return NextResponse.json({ ...record, parentRecord });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const {
        title, type, category, priority, status, description, resolution, rootCause,
        notes, assignee, reportedBy, scheduledDate, nextScheduleDate, completedDate,
        warrantyEndDate, isUnderWarranty, estimatedCost, actualCost,
        beforePhotos, afterPhotos, customerRating, customerFeedback,
    } = body;

    const now = new Date();
    const autoTimestamps = {};
    if (status && STATUS_TIMESTAMPS[status]) {
        const field = STATUS_TIMESTAMPS[status];
        autoTimestamps[field] = now;
    }
    if (status === 'Đang xử lý') autoTimestamps.startedAt = now;

    const record = await prisma.maintenanceRecord.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(type !== undefined && { type }),
            ...(category !== undefined && { category }),
            ...(priority !== undefined && { priority }),
            ...(status !== undefined && { status }),
            ...(description !== undefined && { description }),
            ...(resolution !== undefined && { resolution }),
            ...(rootCause !== undefined && { rootCause }),
            ...(notes !== undefined && { notes }),
            ...(assignee !== undefined && { assignee }),
            ...(reportedBy !== undefined && { reportedBy }),
            ...(isUnderWarranty !== undefined && { isUnderWarranty }),
            ...(estimatedCost !== undefined && { estimatedCost: Number(estimatedCost) }),
            ...(actualCost !== undefined && { actualCost: Number(actualCost) }),
            ...(customerRating !== undefined && { customerRating: customerRating ? Number(customerRating) : null }),
            ...(customerFeedback !== undefined && { customerFeedback }),
            ...(beforePhotos !== undefined && { beforePhotos: JSON.stringify(beforePhotos) }),
            ...(afterPhotos !== undefined && { afterPhotos: JSON.stringify(afterPhotos) }),
            scheduledDate: scheduledDate !== undefined ? (scheduledDate ? new Date(scheduledDate) : null) : undefined,
            nextScheduleDate: nextScheduleDate !== undefined ? (nextScheduleDate ? new Date(nextScheduleDate) : null) : undefined,
            completedDate: completedDate !== undefined ? (completedDate ? new Date(completedDate) : null) : undefined,
            warrantyEndDate: warrantyEndDate !== undefined ? (warrantyEndDate ? new Date(warrantyEndDate) : null) : undefined,
            ...autoTimestamps,
        },
        include: { project: { select: { name: true, code: true } } },
    });

    return NextResponse.json(record);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.maintenanceRecord.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
});
