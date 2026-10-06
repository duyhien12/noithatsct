import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseInstallPlan } from './validate';

// Kế hoạch lắp đặt tại công trình — bảng InstallPlan riêng, không dính ScheduleTask
export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where = { project: { deletedAt: null } };
    if (projectId) where.projectId = projectId;
    // Lấy kế hoạch giao với khoảng [from, to)
    if (from) where.endDate = { gte: new Date(from) };
    if (to) where.startDate = { lt: new Date(to) };

    const plans = await prisma.installPlan.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { order: 'asc' }],
        include: { project: { select: { id: true, code: true, name: true } } },
    });
    return NextResponse.json(plans);
});

export const POST = withAuth(async (req, context, session) => {
    const { data, error } = parseInstallPlan(await req.json(), { requireProject: true });
    if (error) return NextResponse.json({ error }, { status: 400 });

    const last = await prisma.installPlan.findFirst({
        where: { projectId: data.projectId },
        orderBy: { order: 'desc' },
        select: { order: true },
    });
    const plan = await prisma.installPlan.create({
        data: { ...data, order: (last?.order ?? 0) + 1, createdBy: session?.user?.name || '' },
    });
    return NextResponse.json(plan, { status: 201 });
});
