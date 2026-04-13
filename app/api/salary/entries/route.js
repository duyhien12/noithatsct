import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
    const entries = await prisma.salaryEntry.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: entries });
});

export const POST = withAuth(async (request) => {
    const { code, name, contractValue, stages, assignees, notes } = await request.json();

    if (!code || !name) {
        return NextResponse.json({ error: 'Thiếu mã hoặc tên' }, { status: 400 });
    }

    const entry = await prisma.salaryEntry.create({
        data: {
            code,
            name,
            contractValue: contractValue || 0,
            stages: JSON.stringify(stages || {}),
            assignees: JSON.stringify(assignees || {}),
            notes: notes || '',
        },
    });

    return NextResponse.json(entry, { status: 201 });
});
