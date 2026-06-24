import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id: processId, stepId } = await params;
    const body = await request.json();
    const { startDate, endDate, ...rest } = body;

    const data = { ...rest };
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (data.startDate && data.endDate) {
        data.duration = Math.max(1, Math.ceil((data.endDate - data.startDate) / 86400000));
    }

    const step = await prisma.contractProcessStep.update({ where: { id: stepId }, data });

    // Recalc parent progress
    if (step.parentId) {
        const siblings = await prisma.contractProcessStep.findMany({ where: { parentId: step.parentId } });
        const parentProgress = Math.round(siblings.reduce((acc, t) => acc + t.progress, 0) / siblings.length);
        await prisma.contractProcessStep.update({ where: { id: step.parentId }, data: { progress: parentProgress } });
    }

    // Recalc overall process
    const allSteps = await prisma.contractProcessStep.findMany({ where: { processId } });
    const leafSteps = allSteps.filter(s => !allSteps.some(o => o.parentId === s.id));
    const processProgress = leafSteps.length > 0
        ? Math.round(leafSteps.reduce((acc, t) => acc + t.progress, 0) / leafSteps.length)
        : 0;
    await prisma.contractProcess.update({ where: { id: processId }, data: { progress: processProgress } });

    return NextResponse.json(step);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { stepId } = await params;
    await prisma.contractProcessStep.delete({ where: { id: stepId } });
    return NextResponse.json({ success: true });
});
