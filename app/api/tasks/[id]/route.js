import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

function calcNextDueDate(dueDate, recurringType, recurringDays, recurringInterval) {
    const interval = recurringInterval || 1;
    const base = dueDate ? new Date(dueDate) : new Date();

    if (recurringType === 'daily') {
        const next = new Date(base);
        next.setDate(next.getDate() + interval);
        return next;
    }

    if (recurringType === 'weekly') {
        const days = recurringDays ? JSON.parse(recurringDays) : [];
        if (days.length === 0) {
            const next = new Date(base);
            next.setDate(next.getDate() + 7 * interval);
            return next;
        }
        // Tìm ngày tiếp theo trong tuần khớp với recurringDays
        const next = new Date(base);
        next.setDate(next.getDate() + 1);
        for (let i = 0; i < 7 * interval + 7; i++) {
            if (days.includes(next.getDay())) return next;
            next.setDate(next.getDate() + 1);
        }
        return next;
    }

    if (recurringType === 'monthly') {
        const next = new Date(base);
        next.setMonth(next.getMonth() + interval);
        return next;
    }

    return null;
}

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const task = await prisma.task.findUnique({
        where: { id },
        include: { subTasks: { orderBy: { createdAt: 'asc' } } },
    });
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(task);
});

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { status, title, description, priority, assignee, dueDate,
            recurringType, recurringDays, recurringInterval, recurringEndDate } = body;

    const data = {};
    if (status !== undefined) data.status = status;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (assignee !== undefined) data.assignee = assignee;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (recurringType !== undefined) data.recurringType = recurringType || null;
    if (recurringDays !== undefined) data.recurringDays = recurringDays || null;
    if (recurringInterval !== undefined) data.recurringInterval = recurringInterval || 1;
    if (recurringEndDate !== undefined) data.recurringEndDate = recurringEndDate ? new Date(recurringEndDate) : null;
    data.updatedAt = new Date();

    const task = await prisma.task.update({ where: { id }, data, include: { subTasks: { orderBy: { createdAt: 'asc' } } } });

    // Tự tạo lần lặp tiếp theo khi hoàn thành task định kỳ
    let newRecurringTask = null;
    if (status === 'Hoàn thành' && task.recurringType) {
        const endDate = task.recurringEndDate ? new Date(task.recurringEndDate) : null;
        const nextDue = calcNextDueDate(task.dueDate, task.recurringType, task.recurringDays, task.recurringInterval);
        const shouldCreate = nextDue && (!endDate || nextDue <= endDate);

        if (shouldCreate) {
            newRecurringTask = await prisma.task.create({
                data: {
                    title: task.title,
                    description: task.description,
                    status: 'Việc định kỳ',
                    priority: task.priority,
                    assignee: task.assignee,
                    dueDate: nextDue,
                    createdBy: task.createdBy,
                    recurringType: task.recurringType,
                    recurringDays: task.recurringDays,
                    recurringInterval: task.recurringInterval,
                    recurringEndDate: task.recurringEndDate,
                },
            });
        }
    }

    return NextResponse.json({ task, newRecurringTask });
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
