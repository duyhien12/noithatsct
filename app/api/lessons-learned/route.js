import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { lessonLearnedCreateSchema } from '@/lib/validations/lessonLearned';
import { VIEW_ROLES, CREATE_ROLES, getLessonPermissions } from '@/lib/lessonLearned';

const SORTABLE_FIELDS = ['occurredAt', 'createdAt', 'severity', 'status', 'category'];

export const GET = withAuth(async (request, _ctx, session) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const projectId = searchParams.get('projectId');
    const customerId = searchParams.get('customerId');
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const createdBy = searchParams.get('createdBy');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const search = searchParams.get('search');
    const sortBy = SORTABLE_FIELDS.includes(searchParams.get('sortBy')) ? searchParams.get('sortBy') : 'occurredAt';
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    const where = {};
    if (projectId) where.projectId = projectId;
    if (customerId) where.customerId = customerId;
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (createdBy) where.createdBy = createdBy;
    if (fromDate || toDate) {
        where.occurredAt = {};
        if (fromDate) where.occurredAt.gte = new Date(fromDate);
        if (toDate) where.occurredAt.lte = new Date(`${toDate}T23:59:59.999Z`);
    }
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { projectName: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { issueContent: { contains: search, mode: 'insensitive' } },
            { cause: { contains: search, mode: 'insensitive' } },
            { solution: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [lessons, total] = await Promise.all([
        prisma.lessonLearned.findMany({
            where,
            include: {
                project: { select: { name: true } },
                customer: { select: { name: true } },
            },
            orderBy: { [sortBy]: sortDir },
            skip,
            take: limit,
        }),
        prisma.lessonLearned.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(lessons, total, { page, limit }));
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const validated = lessonLearnedCreateSchema.parse(body);

    if (validated.projectId) {
        const project = await prisma.project.findUnique({ where: { id: validated.projectId }, select: { name: true } });
        if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
        if (!validated.projectName) validated.projectName = project.name;
    }
    if (validated.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: validated.customerId }, select: { name: true } });
        if (!customer) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
        if (!validated.customerName) validated.customerName = customer.name;
    }

    const history = [{
        at: new Date().toISOString(),
        by: session.user.name,
        action: 'Tạo bài học',
    }];

    const result = await withCodeRetry('lessonLearned', 'BH', (code) =>
        prisma.lessonLearned.create({
            data: {
                code,
                ...validated,
                history,
                createdBy: session.user.name,
                createdById: session.user.id,
                createdByRole: session.user.role,
            },
        })
    );

    return NextResponse.json(result, { status: 201 });
}, { roles: CREATE_ROLES });
