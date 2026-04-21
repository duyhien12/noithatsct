import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { projectId, projectName, mainWorkers = [], subWorkers = [], note = '' } = body;

    const entry = await prisma.workLogEntry.update({
        where: { id },
        data: {
            project: projectId ? { connect: { id: projectId } } : { disconnect: true },
            projectName: projectName || '',
            mainWorkers: JSON.stringify(Array.isArray(mainWorkers) ? mainWorkers : []),
            subWorkers: JSON.stringify(Array.isArray(subWorkers) ? subWorkers : []),
            note: note || '',
        },
        include: {
            project: { select: { id: true, code: true, name: true } },
        },
    });
    return NextResponse.json(entry);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.workLogEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
