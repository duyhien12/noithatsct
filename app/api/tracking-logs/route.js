import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || '';

    const where = {};
    if (search) {
        where.OR = [
            { title: { contains: search } },
            { project: { name: { contains: search } } },
        ];
    }

    const [logs, total] = await Promise.all([
        prisma.trackingLog.findMany({
            where,
            include: { project: { select: { name: true, code: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.trackingLog.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(logs, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const data = await request.json();
    const log = await prisma.trackingLog.create({ data });
    return NextResponse.json(log);
});
