import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignee = searchParams.get('assignee');

    const where = {};
    if (status) where.status = status;
    if (assignee) where.assignee = assignee;

    const tasks = await prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: tasks });
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const { title, description, status, priority, assignee, dueDate } = body;
    if (!title?.trim()) return NextResponse.json({ error: 'Thiếu tiêu đề' }, { status: 400 });

    const task = await prisma.task.create({
        data: {
            title: title.trim(),
            description: description?.trim() || '',
            status: status || 'Việc sẽ làm',
            priority: priority || 'Trung bình',
            assignee: assignee || '',
            dueDate: dueDate ? new Date(dueDate) : null,
            createdBy: session?.user?.name || '',
        },
    });

    return NextResponse.json(task, { status: 201 });
});
