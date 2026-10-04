import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { designJournalCreateSchema } from '@/lib/validations/designJournal';
import { VIEW_ROLES, MANAGE_ROLES } from '@/lib/designTaskStatus';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const executorName = searchParams.get('executorName');
    const search = searchParams.get('search');

    const where = {};
    if (executorName) where.executorName = executorName;
    if (search) {
        where.OR = [
            { content: { contains: search, mode: 'insensitive' } },
            { projectName: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [journals, total] = await Promise.all([
        prisma.designJournal.findMany({
            where,
            orderBy: [{ startDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
            skip,
            take: limit,
        }),
        prisma.designJournal.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(journals, total, { page, limit }));
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const validated = designJournalCreateSchema.parse(body);

    const journal = await prisma.designJournal.create({
        data: { ...validated, createdBy: session.user.name || '' },
    });

    return NextResponse.json(journal, { status: 201 });
}, { roles: MANAGE_ROLES });
