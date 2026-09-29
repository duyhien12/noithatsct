import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseAssignees, joinAssignees, MAX_TASK_ASSIGNEES } from '@/lib/taskAssignees';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignee = searchParams.get('assignee');
    const dept = searchParams.get('dept');

    const where = { parentId: null };
    if (status) where.status = status;

    // assignee có thể chứa nhiều người ("A, B, C") → lọc thô bằng contains rồi lọc chính xác sau
    let matchNames = null;
    if (assignee) {
        matchNames = [assignee];
        where.OR = [
            { assignee: { contains: assignee } },
            { createdBy: assignee },
        ];
    } else if (dept) {
        const deptUsers = await prisma.user.findMany({
            where: { role: dept, active: true },
            select: { name: true },
        });
        const names = deptUsers.map(u => u.name);
        if (names.length > 0) {
            matchNames = names;
            where.OR = [
                ...names.map(n => ({ assignee: { contains: n } })),
                { createdBy: { in: names } },
            ];
        }
    }

    let tasks = await prisma.task.findMany({
        where,
        include: { subTasks: { orderBy: { createdAt: 'asc' } } },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    if (matchNames) {
        tasks = tasks.filter(t => matchNames.includes(t.createdBy)
            || parseAssignees(t.assignee).some(n => matchNames.includes(n)));
    }

    return NextResponse.json({ data: tasks });
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const { title, description, status, priority, assignee, dueDate, parentId,
            recurringType, recurringDays, recurringInterval, recurringEndDate } = body;
    if (!title?.trim()) return NextResponse.json({ error: 'Thiếu tiêu đề' }, { status: 400 });

    const task = await prisma.task.create({
        data: {
            title: title.trim(),
            description: description?.trim() || '',
            status: status || 'Việc sẽ làm',
            priority: priority || 'Trung bình',
            assignee: joinAssignees(parseAssignees(assignee).slice(0, MAX_TASK_ASSIGNEES)),
            dueDate: dueDate ? new Date(dueDate) : null,
            createdBy: session?.user?.name || '',
            parentId: parentId || null,
            recurringType: recurringType || null,
            recurringDays: recurringDays || null,
            recurringInterval: recurringInterval || 1,
            recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
        },
    });

    return NextResponse.json(task, { status: 201 });
});
