import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { workOrderCreateSchema } from '@/lib/validations/workOrder';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
        prisma.workOrder.findMany({
            where,
            include: { project: { select: { name: true, code: true } } },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.workOrder.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = workOrderCreateSchema.parse(body);
    const code = await generateCode('workOrder', 'WO');
    const order = await prisma.workOrder.create({
        data: {
            code,
            ...data,
        },
    });
    return NextResponse.json(order, { status: 201 });
});
