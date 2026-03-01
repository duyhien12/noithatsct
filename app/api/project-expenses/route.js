import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { expenseCreateSchema, expenseUpdateSchema } from '@/lib/validations/expense';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const expenseType = searchParams.get('expenseType');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (status) where.status = status;
    if (expenseType) where.expenseType = expenseType;
    if (projectId) where.projectId = projectId;
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
        prisma.projectExpense.findMany({
            where,
            include: { project: { select: { name: true, code: true } } },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.projectExpense.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = expenseCreateSchema.parse(body);
    const code = await generateCode('projectExpense', 'CP');
    const expense = await prisma.projectExpense.create({
        data: {
            code,
            ...data,
        },
    });
    return NextResponse.json(expense, { status: 201 });
});

export const PUT = withAuth(async (request) => {
    const body = await request.json();
    const { id, ...raw } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const data = expenseUpdateSchema.parse(raw);
    const expense = await prisma.projectExpense.update({ where: { id }, data });
    return NextResponse.json(expense);
});

export const DELETE = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.projectExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
