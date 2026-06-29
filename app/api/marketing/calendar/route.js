import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // format: YYYY-MM
    const assignee = searchParams.get('assignee');

    let where = {};

    if (month) {
        const [year, m] = month.split('-').map(Number);
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 0, 23, 59, 59);
        where.date = { gte: start, lte: end };
    }

    if (assignee) {
        where.assignee = assignee;
    }

    const events = await prisma.marketingCalendarEvent.findMany({
        where,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ data: events });
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const { title, description, date, startTime, endTime, assignee, status, priority } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Thiếu tiêu đề' }, { status: 400 });
    if (!date) return NextResponse.json({ error: 'Thiếu ngày' }, { status: 400 });

    const event = await prisma.marketingCalendarEvent.create({
        data: {
            title: title.trim(),
            description: description?.trim() || '',
            date: new Date(date),
            startTime: startTime || null,
            endTime: endTime || null,
            assignee: assignee || '',
            status: status || 'Cần làm',
            priority: priority || 'Trung bình',
            createdBy: session?.user?.name || '',
        },
    });

    return NextResponse.json(event, { status: 201 });
});
