import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { status, title, description, priority, assignee, dueDate } = body;

    const data = {};
    if (status !== undefined) data.status = status;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (assignee !== undefined) data.assignee = assignee;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    data.updatedAt = new Date();

    const task = await prisma.task.update({ where: { id }, data });
    return NextResponse.json(task);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
