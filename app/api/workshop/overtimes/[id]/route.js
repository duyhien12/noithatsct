import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { hours, rateMultiplier, reason, notes, date } = body;

    const existing = await prisma.workerOvertime.findUnique({
        where: { id },
        include: { worker: { select: { hourlyRate: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const h = hours !== undefined ? Number(hours) : existing.hours;
    const m = rateMultiplier !== undefined ? Number(rateMultiplier) : existing.rateMultiplier;
    const totalPay = h * (existing.worker.hourlyRate / 8) * m;

    const record = await prisma.workerOvertime.update({
        where: { id },
        data: {
            hours: h,
            rateMultiplier: m,
            totalPay,
            ...(reason !== undefined && { reason }),
            ...(notes !== undefined && { notes }),
            ...(date && { date: new Date(date) }),
        },
        include: { worker: { select: { id: true, name: true, hourlyRate: true } } },
    });
    return NextResponse.json(record);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.workerOvertime.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
});
