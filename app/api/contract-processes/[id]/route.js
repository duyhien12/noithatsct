import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const proc = await prisma.contractProcess.findUnique({
        where: { id },
        include: {
            customer: { select: { id: true, name: true, phone: true, code: true, address: true } },
            contract: { select: { id: true, code: true, contractValue: true, paidAmount: true } },
            steps: { orderBy: { sortOrder: 'asc' } },
        },
    });
    if (!proc) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Build tree
    const stepMap = {};
    const roots = [];
    proc.steps.forEach(s => { stepMap[s.id] = { ...s, children: [] }; });
    proc.steps.forEach(s => {
        if (s.parentId && stepMap[s.parentId]) {
            stepMap[s.parentId].children.push(stepMap[s.id]);
        } else if (!s.parentId) {
            roots.push(stepMap[s.id]);
        }
    });

    return NextResponse.json({ ...proc, stepsTree: roots });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { name, status, startDate, endDate, notes, contractId } = body;

    const steps = await prisma.contractProcessStep.findMany({ where: { processId: id } });
    const leafSteps = steps.filter(s => !steps.some(o => o.parentId === s.id));
    const progress = leafSteps.length > 0
        ? Math.round(leafSteps.reduce((acc, t) => acc + t.progress, 0) / leafSteps.length)
        : 0;

    const updateData = { progress };
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (contractId !== undefined) updateData.contractId = contractId || null;

    const updated = await prisma.contractProcess.update({
        where: { id },
        data: updateData,
        include: {
            customer: { select: { id: true, name: true, phone: true, code: true } },
            steps: { orderBy: { sortOrder: 'asc' } },
        },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.contractProcess.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
});
