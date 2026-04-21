import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const where = {};
    if (start && end) {
        where.date = {
            gte: new Date(start),
            lte: new Date(end + 'T23:59:59'),
        };
    }

    const entries = await prisma.workLogEntry.findMany({
        where,
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        include: {
            project: { select: { id: true, code: true, name: true } },
        },
    });
    return NextResponse.json(entries);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { date, category, projectId, projectName, mainWorkers = [], subWorkers = [], note = '' } = body;

    if (!date || !category) {
        return NextResponse.json({ error: 'date và category bắt buộc' }, { status: 400 });
    }

    const entry = await prisma.workLogEntry.create({
        data: {
            date: new Date(date),
            category,
            project: projectId ? { connect: { id: projectId } } : undefined,
            projectName: projectName || '',
            mainWorkers: JSON.stringify(Array.isArray(mainWorkers) ? mainWorkers : []),
            subWorkers: JSON.stringify(Array.isArray(subWorkers) ? subWorkers : []),
            note: note || '',
        },
        include: {
            project: { select: { id: true, code: true, name: true } },
        },
    });
    return NextResponse.json(entry, { status: 201 });
});
