import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { aiSummary, createdBy } = body;
    const data = {};
    if (aiSummary !== undefined) data.aiSummary = aiSummary;
    if (createdBy !== undefined) data.createdBy = createdBy;

    const entry = await prisma.journalEntry.update({
        where: { id },
        data,
        include: { commitments: true },
    });
    return NextResponse.json(entry);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.journalEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
