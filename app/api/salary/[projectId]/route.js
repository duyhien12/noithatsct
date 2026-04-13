import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { projectId } = await params;
    const { stages, assignees, notes, contractValueOverride } = await request.json();

    const data = {
        stages: JSON.stringify(stages || {}),
        assignees: JSON.stringify(assignees || {}),
        notes: notes || '',
    };
    if (contractValueOverride !== undefined) {
        data.contractValueOverride = contractValueOverride === '' ? null : parseFloat(contractValueOverride) || null;
    }

    const record = await prisma.salaryProgress.upsert({
        where: { projectId },
        update: data,
        create: { projectId, ...data },
    });

    return NextResponse.json(record);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { projectId } = await params;
    await prisma.salaryProgress.deleteMany({ where: { projectId } });
    return NextResponse.json({ ok: true });
});
