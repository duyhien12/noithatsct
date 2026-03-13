import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
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

    const project = await prisma.$transaction(async (tx) => {
        // Advisory lock: only one transaction can generate a DA code at a time
        // (works across all server instances sharing the same PostgreSQL DB)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('project_code_da'))`;

        const records = await tx.project.findMany({
            where: { code: { startsWith: 'DA' } },
            select: { code: true },
        });
        const existing = new Set(records.map(r => r.code));
        const maxNum = records
            .map(r => r.code.slice(2))
            .filter(s => /^\d+$/.test(s))
            .reduce((max, s) => Math.max(max, Number(s)), 0);
        let candidate = maxNum + 1;
        while (existing.has(`DA${String(candidate).padStart(3, '0')}`)) candidate++;
        const code = `DA${String(candidate).padStart(3, '0')}`;

        const proj = await tx.project.create({ data: { code, ...data } });
        await createDefaultFolders(tx, proj.id);
        return proj;
    });

    return NextResponse.json(project, { status: 201 });
});
