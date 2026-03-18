import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { scheduleImportSchema } from '@/lib/validations/scheduleTask';

/**
 * Import a schedule template into a project.
 * Spreads template items across calendar days starting from startDate,
 * respecting dependencies (Finish-to-Start).
 */
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { projectId, templateId, startDate, force } = scheduleImportSchema.parse(body);

    // M1: Warn if project already has schedule tasks (prevent accidental double-import)
    if (!force) {
        const existingCount = await prisma.scheduleTask.count({ where: { projectId } });
        if (existingCount > 0) {
            return NextResponse.json({
                warning: `Dự án đã có ${existingCount} hạng mục. Import sẽ thêm mới, không ghi đè.`,
                existingCount,
                confirm: true,
            }, { status: 409 });
        }
    }

    const template = await prisma.scheduleTemplate.findUnique({
        where: { id: templateId },
        include: {
            items: { orderBy: [{ order: 'asc' }] },
        },
    });
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const baseDate = new Date(startDate);
    const items = template.items;

    // Map: templateItemId → created ScheduleTask id
    const idMap = new Map();
    // Map: templateItemId → { startDate, endDate }
    const dateMap = new Map();

    // First pass: calculate dates (respecting dependencies)
    for (const item of items) {
        let itemStart = new Date(baseDate);

        if (item.predecessorId && dateMap.has(item.predecessorId)) {
            // Start after predecessor ends + 1 day
            const predEnd = dateMap.get(item.predecessorId).endDate;
            itemStart = new Date(predEnd);
            itemStart.setDate(itemStart.getDate() + 1);
        } else if (item.parentId && dateMap.has(item.parentId)) {
            // Child starts when parent starts
            itemStart = new Date(dateMap.get(item.parentId).startDate);
        }

        const itemEnd = new Date(itemStart);
        itemEnd.setDate(itemEnd.getDate() + item.duration - 1);

        dateMap.set(item.id, { startDate: itemStart, endDate: itemEnd });
    }

    // Second pass: create tasks in transaction
    const tasks = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const item of items) {
            const dates = dateMap.get(item.id);
            const task = await tx.scheduleTask.create({
                data: {
                    name: item.name,
                    order: item.order,
                    level: item.level,
                    wbs: item.wbs,
                    duration: item.duration,
                    weight: item.weight,
                    color: item.color,
                    startDate: dates.startDate,
                    endDate: dates.endDate,
                    projectId,
                    // Parent & predecessor mapped after creation
                    parentId: item.parentId ? (idMap.get(item.parentId) || null) : null,
                    predecessorId: item.predecessorId ? (idMap.get(item.predecessorId) || null) : null,
                },
            });
            idMap.set(item.id, task.id);
            created.push(task);
        }

        // Update parent groups: set their endDate to max of children endDate
        const parentIds = [...new Set(created.filter(t => t.parentId).map(t => t.parentId))];
        for (const pid of parentIds) {
            const children = created.filter(t => t.parentId === pid);
            if (children.length) {
                const maxEnd = new Date(Math.max(...children.map(c => new Date(c.endDate))));
                const minStart = new Date(Math.min(...children.map(c => new Date(c.startDate))));
                await tx.scheduleTask.update({
                    where: { id: pid },
                    data: {
                        startDate: minStart,
                        endDate: maxEnd,
                        duration: Math.max(1, Math.ceil((maxEnd - minStart) / 86400000)),
                    },
                });
            }
        }

        return created;
    });

    return NextResponse.json({ count: tasks.length, tasks }, { status: 201 });
});
