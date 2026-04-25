import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get('workerId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    const where = {};
    if (workerId) where.workerId = workerId;
    if (status) where.status = status;
    if (month) {
        const [y, m] = month.split('-').map(Number);
        where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    } else if (date) {
        const d = new Date(date);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        where.date = { gte: d, lt: nextDay };
    }

    const records = await prisma.workerOvertime.findMany({
        where,
        include: { worker: { select: { id: true, name: true, hourlyRate: true } } },
        orderBy: { date: 'desc' },
    });
    return NextResponse.json(records);
});

export const POST = withAuth(async (req, ctx, session) => {
    const body = await req.json();
    const { workerId, date, hours, rateMultiplier, reason, notes } = body;

    if (!workerId || !date || !hours) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const worker = await prisma.workshopWorker.findUnique({ where: { id: workerId } });
    if (!worker) return NextResponse.json({ error: 'Không tìm thấy thợ' }, { status: 404 });

    const multiplier = Number(rateMultiplier) || 1.5;
    const hourlyRate = worker.hourlyRate / 8;
    const totalPay = Number(hours) * hourlyRate * multiplier;

    const record = await prisma.workerOvertime.create({
        data: {
            workerId,
            date: new Date(date),
            hours: Number(hours),
            rateMultiplier: multiplier,
            totalPay,
            reason: reason?.trim() || '',
            notes: notes?.trim() || '',
            createdBy: session?.user?.name || '',
        },
        include: { worker: { select: { id: true, name: true, hourlyRate: true } } },
    });
    return NextResponse.json(record);
});
