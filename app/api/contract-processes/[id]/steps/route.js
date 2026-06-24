import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id: processId } = await params;
    const steps = await prisma.contractProcessStep.findMany({
        where: { processId },
        orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(steps);
});

export const POST = withAuth(async (request, { params }) => {
    const { id: processId } = await params;
    const body = await request.json();
    const { name, parentId, wbs, assignee, department, startDate, endDate, duration, level, sortOrder, isPaymentStep, paymentPercent, color, notes } = body;

    const maxOrder = await prisma.contractProcessStep.aggregate({
        where: { processId },
        _max: { sortOrder: true },
    });

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const dur = start && end ? Math.max(1, Math.ceil((end - start) / 86400000)) : (duration || 1);

    const step = await prisma.contractProcessStep.create({
        data: {
            processId,
            parentId: parentId || null,
            wbs: wbs || '',
            name,
            assignee: assignee || '',
            department: department || '',
            startDate: start,
            endDate: end,
            duration: dur,
            level: level || 0,
            sortOrder: sortOrder ?? ((maxOrder._max.sortOrder ?? -1) + 1),
            isPaymentStep: isPaymentStep || false,
            paymentPercent: paymentPercent || 0,
            color: color || '',
            notes: notes || '',
        },
    });
    await recalcProcess(processId);
    return NextResponse.json(step, { status: 201 });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id: processId } = await params;
    const body = await request.json();
    const { updates } = body;

    await prisma.$transaction(
        updates.map(({ id, ...data }) => {
            if (data.startDate) data.startDate = new Date(data.startDate);
            if (data.endDate) data.endDate = new Date(data.endDate);
            if (data.startDate && data.endDate) {
                data.duration = Math.max(1, Math.ceil((new Date(data.endDate) - new Date(data.startDate)) / 86400000));
            }
            return prisma.contractProcessStep.update({ where: { id }, data });
        })
    );
    await recalcProcess(processId);
    const steps = await prisma.contractProcessStep.findMany({
        where: { processId },
        orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(steps);
});

async function recalcProcess(processId) {
    const steps = await prisma.contractProcessStep.findMany({ where: { processId } });
    const leafSteps = steps.filter(s => !steps.some(other => other.parentId === s.id));
    const progress = leafSteps.length > 0
        ? Math.round(leafSteps.reduce((acc, t) => acc + t.progress, 0) / leafSteps.length)
        : 0;
    await prisma.contractProcess.update({ where: { id: processId }, data: { progress } });
}
