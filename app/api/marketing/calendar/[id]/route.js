import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { title, description, date, startTime, endTime, assignee, status, priority } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Thiếu tiêu đề' }, { status: 400 });

    const event = await prisma.marketingCalendarEvent.update({
        where: { id },
        data: {
            title: title.trim(),
            description: description?.trim() || '',
            date: date ? new Date(date) : undefined,
            startTime: startTime || null,
            endTime: endTime || null,
            assignee: assignee || '',
            status: status || 'Cần làm',
            priority: priority || 'Trung bình',
        },
    });

    return NextResponse.json(event);
});

export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    await prisma.marketingCalendarEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
