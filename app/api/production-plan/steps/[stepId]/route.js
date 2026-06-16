import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PATCH = withAuth(async (req, { params }, session) => {
    const { stepId } = await params;
    const body = await req.json();

    const updateData = {};

    if ('completed' in body) {
        updateData.completed = body.completed;
        updateData.completedAt = body.completed ? new Date() : null;
        updateData.completedBy = body.completed ? (session?.user?.name || '') : '';
    }
    if (body.deadline !== undefined) {
        updateData.deadline = body.deadline ? new Date(body.deadline) : null;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.name !== undefined) updateData.name = body.name;

    const step = await prisma.productionPlanStep.update({
        where: { id: stepId },
        data: updateData,
    });
    return NextResponse.json(step);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { stepId } = await params;
    await prisma.productionPlanStep.delete({ where: { id: stepId } });
    return NextResponse.json({ ok: true });
});
