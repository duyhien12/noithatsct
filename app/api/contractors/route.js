import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { contractorCreateSchema } from '@/lib/validations/contractor';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const where = {};

    const [data, total] = await Promise.all([
        prisma.contractor.findMany({
            where,
            include: { payments: { select: { contractAmount: true, paidAmount: true, status: true } } },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.contractor.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = contractorCreateSchema.parse(body);
    const contractor = await withCodeRetry('contractor', 'TT', (code) =>
        prisma.contractor.create({ data: { code, ...data } })
    );
    return NextResponse.json(contractor, { status: 201 });
});
