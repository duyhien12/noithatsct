import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { scheduleTaskCreateSchema, scheduleTaskBulkUpdateSchema } from '@/lib/validations/scheduleTask';
import { recalcProjectProgress } from '@/lib/scheduleUtils';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const tasks = await prisma.scheduleTask.findMany({
        where: { projectId },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    // Build tree structure
    const taskMap = new Map();
    const roots = [];
    tasks.forEach(t => taskMap.set(t.id, { ...t, children: [] }));
    tasks.forEach(t => {
        const node = taskMap.get(t.id);
        if (t.parentId && taskMap.has(t.parentId)) {
            taskMap.get(t.parentId).children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Calculate weighted progress
    const calcProgress = (nodes) => {
        if (!nodes.length) return 0;
        const totalWeight = nodes.reduce((s, n) => s + n.weight, 0);
        if (totalWeight === 0) return 0;
        return Math.round(nodes.reduce((s, n) => s + n.progress * n.weight, 0) / totalWeight);
    };

    return NextResponse.json({
        tasks: roots,
        flat: tasks,
        totalProgress: calcProgress(tasks.filter(t => !t.parentId)),
    });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();

    // Single create
    const data = scheduleTaskCreateSchema.parse(body);

    // Auto-calc duration
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = Math.max(1, Math.ceil((end - start) / 86400000));
    data.duration = diffDays;

    const task = await prisma.scheduleTask.create({ data });

    // Recalc project progress
    await recalcProjectProgress(data.projectId);

    return NextResponse.json(task, { status: 201 });
});

// Bulk update (for Gantt drag & drop)
export const PUT = withAuth(async (request) => {
    const body = await request.json();
    const updates = scheduleTaskBulkUpdateSchema.parse(body);

    const results = await prisma.$transaction(
        updates.map(u => {
            const { id, ...data } = u;
            if (data.startDate && data.endDate) {
                data.duration = Math.max(1, Math.ceil((new Date(data.endDate) - new Date(data.startDate)) / 86400000));
            }
            return prisma.scheduleTask.update({ where: { id }, data });
        })
    );

    if (results.length > 0) {
        await recalcProjectProgress(results[0].projectId);
    }

    return NextResponse.json(results);
});

