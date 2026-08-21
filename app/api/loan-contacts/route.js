import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { loanContactCreateSchema } from '@/lib/validations/loanContact';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const search = searchParams.get('search');
    const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};

    const [data, total] = await Promise.all([
        prisma.loanContact.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.loanContact.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = loanContactCreateSchema.parse(body);
    const contact = await prisma.loanContact.create({ data });
    return NextResponse.json(contact, { status: 201 });
});
