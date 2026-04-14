import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { code, name, contractValue, stages, assignees, progress, notes } = await request.json();

    const entry = await prisma.salaryEntry.update({
        where: { id },
        data: {
            code,
            name,
            contractValue: contractValue || 0,
            stages: JSON.stringify(stages || {}),
            assignees: JSON.stringify(assignees || {}),
            progress: JSON.stringify(progress || {}),
            notes: notes || '',
        },
    });

    return NextResponse.json(entry);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.salaryEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
