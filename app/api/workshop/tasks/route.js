import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const tasks = await prisma.workshopTask.findMany({
        where,
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
        include: {
            project: { select: { id: true, code: true, name: true } },
            workers: {
                include: { worker: { select: { id: true, name: true, skill: true } } },
            },
            materials: {
                include: { product: { select: { id: true, name: true, unit: true } } },
            },
        },
    });
    return NextResponse.json(tasks);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { title, description, projectId, startDate, deadline, priority, notes, workerIds = [], materials = [] } = body;

    if (!title?.trim()) {
        return NextResponse.json({ error: 'Tiêu đề bắt buộc' }, { status: 400 });
    }

    const task = await prisma.workshopTask.create({
        data: {
            title: title.trim(),
            description: description?.trim() || '',
            projectId: projectId || null,
            startDate: startDate ? new Date(startDate) : null,
            deadline: deadline ? new Date(deadline) : null,
            priority: priority || 'Trung bình',
            notes: notes?.trim() || '',
            workers: workerIds.length > 0 ? {
                create: workerIds.map(wid => ({ workerId: wid })),
            } : undefined,
            materials: materials.length > 0 ? {
                create: materials.map(m => ({ productId: m.productId, quantity: Number(m.quantity) || 1 })),
            } : undefined,
        },
        include: {
            project: { select: { id: true, code: true, name: true } },
            workers: { include: { worker: { select: { id: true, name: true, skill: true } } } },
            materials: { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
    });
    return NextResponse.json(task, { status: 201 });
});
