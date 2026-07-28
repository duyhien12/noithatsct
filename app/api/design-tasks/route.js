import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withDailyCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { designTaskCreateSchema } from '@/lib/validations/designTask';
import { VIEW_ROLES, MANAGE_ROLES } from '@/lib/designTaskStatus';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const executorName = searchParams.get('executorName');
    const customerId = searchParams.get('customerId');
    const search = searchParams.get('search');

    const where = {};
    if (status) where.status = status;
    if (executorName) where.executorName = executorName;
    if (customerId) where.customerId = customerId;
    if (search) {
        where.OR = [
            { code: { contains: search } },
            { customerName: { contains: search } },
            { title: { contains: search } },
        ];
    }

    const [designTasks, total] = await Promise.all([
        prisma.designTask.findMany({
            where,
            include: { customer: { select: { name: true, phone: true, address: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.designTask.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(designTasks, total, { page, limit }));
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const validated = designTaskCreateSchema.parse(body);

    const customer = await prisma.customer.findUnique({ where: { id: validated.customerId }, select: { name: true } });
    if (!customer) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });

    const designTask = await withDailyCodeRetry('designTask', 'CV', (code) =>
        prisma.designTask.create({
            data: {
                code,
                customerId: validated.customerId,
                customerName: customer.name,
                title: validated.title,
                executorName: validated.executorName,
                startDate: validated.startDate,
                endDate: validated.endDate,
                status: validated.status || 'Việc cần làm',
                notes: validated.notes,
                createdBy: session.user.name,
            },
        })
    );

    return NextResponse.json(designTask, { status: 201 });
}, { roles: MANAGE_ROLES });
