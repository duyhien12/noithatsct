import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get('workerId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    const where = {};
    if (workerId) where.workerId = workerId;
    if (date) {
        const d = new Date(date);
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        where.date = { gte: d, lt: nextDay };
    }

    const records = await prisma.workshopAttendance.findMany({
        where,
        include: { worker: { select: { id: true, name: true, skill: true, hourlyRate: true } } },
        orderBy: { date: 'desc' },
        take: 100,
    });
    return NextResponse.json(records);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { workerId, date, hoursWorked, notes } = body;

    if (!workerId || !date) {
        return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const record = await prisma.workshopAttendance.upsert({
        where: { workerId_date: { workerId, date: new Date(date) } },
        create: {
            workerId,
            date: new Date(date),
            hoursWorked: Number(hoursWorked) || 8,
            notes: notes?.trim() || '',
        },
        update: {
            hoursWorked: Number(hoursWorked) || 8,
            notes: notes?.trim() || '',
        },
        include: { worker: { select: { id: true, name: true } } },
    });
    return NextResponse.json(record);
});
