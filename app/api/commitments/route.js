import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const status = searchParams.get('status');
    const where = { projectId };
    if (status) where.status = status;

    const commitments = await prisma.commitment.findMany({
        where,
        include: { journalEntry: { select: { id: true, source: true, createdAt: true, createdBy: true } } },
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(commitments);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { projectId, title, type = 'request', assignee = '', deadline, notes = '', journalEntryId } = body;
    if (!projectId || !title?.trim()) {
        return NextResponse.json({ error: 'projectId và title bắt buộc' }, { status: 400 });
    }

    const commitment = await prisma.commitment.create({
        data: {
            projectId,
            journalEntryId: journalEntryId || null,
            title,
            type,
            assignee,
            deadline: deadline ? new Date(deadline) : null,
            notes,
            status: 'pending',
        },
    });
    return NextResponse.json(commitment);
});
