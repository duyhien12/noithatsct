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

    const where = { NOT: { createdByRole: 'xay_dung' } };
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

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const data = projectCreateSchema.parse(body);

    let project;
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            project = await prisma.$transaction(async (tx) => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('project_code_da'))`;

                // Use $queryRaw to include soft-deleted projects (tx.project.findMany
                // applies deletedAt:null filter, which can cause code reuse and P2002)
                const records = await tx.$queryRaw`
                    SELECT code FROM "Project" WHERE code LIKE 'DA%'
                `;
                const existing = new Set(records.map(r => r.code));
                const maxNum = records
                    .map(r => r.code.slice(2))
                    .filter(s => /^\d+$/.test(s))
                    .reduce((max, s) => Math.max(max, Number(s)), 0);
                let candidate = maxNum + 1;
                while (existing.has(`DA${String(candidate).padStart(3, '0')}`)) candidate++;
                const code = `DA${String(candidate).padStart(3, '0')}`;

                console.log(`[project create] attempt=${attempt} code=${code} existing=[${[...existing].join(',')}]`);
                const proj = await tx.project.create({ data: { code, ...data, createdByRole: session?.user?.role || '' } });
                await createDefaultFolders(tx, proj.id);
                return proj;
            });
            break;
        } catch (err) {
            console.error(`[project create] attempt=${attempt} error=${err.code} meta=${JSON.stringify(err.meta)}`);
            if (err.code === 'P2002' && attempt < 9) continue;
            throw err;
        }
    }

    return NextResponse.json(project, { status: 201 });
});
