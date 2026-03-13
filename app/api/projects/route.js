import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { projectCreateSchema } from '@/lib/validations/project';
import { createDefaultFolders } from '@/lib/defaultFolders';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.name = { contains: search };

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.project.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(projects, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = projectCreateSchema.parse(body);

    const project = await withCodeRetry('project', 'DA', async (code) => {
        return prisma.$transaction(async (tx) => {
            const proj = await tx.project.create({
                data: { code, ...data },
            });
            await createDefaultFolders(tx, proj.id);
            return proj;
        });
    });

    return NextResponse.json(project, { status: 201 });
});
