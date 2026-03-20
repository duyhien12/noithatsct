import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { title, description, projectId, startDate, deadline, priority, status, progress, notes, workerIds, materials } = body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) {
        updateData.progress = Number(progress);
        if (Number(progress) >= 100) updateData.isLocked = true;
    }
    if (notes !== undefined) updateData.notes = notes.trim();

    // Update workers if provided
    if (workerIds !== undefined) {
        updateData.workers = {
            deleteMany: {},
            create: workerIds.map(wid => ({ workerId: wid })),
        };
    }

    // Update materials if provided
    if (materials !== undefined) {
        updateData.materials = {
            deleteMany: {},
            create: materials.map(m => ({ productId: m.productId, quantity: Number(m.quantity) || 1 })),
        };
    }

    const task = await prisma.workshopTask.update({
        where: { id },
        data: updateData,
        include: {
            project: { select: { id: true, code: true, name: true } },
            workers: { include: { worker: { select: { id: true, name: true, skill: true } } } },
            materials: { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
    });
    return NextResponse.json(task);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.workshopTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
