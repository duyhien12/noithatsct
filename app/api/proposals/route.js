import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const mine = searchParams.get('mine');

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const proposals = await prisma.proposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: proposals });
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const { type, title, content } = body;
    if (!title?.trim()) return NextResponse.json({ error: 'Thiếu tiêu đề' }, { status: 400 });

    const proposal = await prisma.proposal.create({
        data: {
            type: type || 'Đề xuất',
            title: title.trim(),
            content: content?.trim() || '',
            submittedBy: session?.user?.email || '',
            submittedName: session?.user?.name || '',
        },
    });

    return NextResponse.json(proposal, { status: 201 });
});
