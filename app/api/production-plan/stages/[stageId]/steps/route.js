import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (req, { params }) => {
    const { stageId } = await params;
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'Thiếu tên bước' }, { status: 400 });

    const maxStep = await prisma.productionPlanStep.findFirst({
        where: { stageId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
    });

    const step = await prisma.productionPlanStep.create({
        data: {
            stageId,
            name: body.name,
            sortOrder: (maxStep?.sortOrder ?? -1) + 1,
        },
    });
    return NextResponse.json(step);
});
