import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { customerCreateSchema } from '@/lib/validations/customer';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const dept = searchParams.get('dept'); // 'xay_dung' | 'kinh_doanh' | null (all)
    const where = {};
    if (dept === 'xay_dung') {
        where.createdByRole = 'xay_dung';
    } else if (dept === 'kinh_doanh') {
        where.NOT = { createdByRole: 'xay_dung' };
    }
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.name = { contains: search };

    try {
        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                include: { projects: { select: { id: true, name: true, status: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.customer.count({ where }),
        ]);
        return NextResponse.json(paginatedResponse(customers, total, { page, limit }));
    } catch (err) {
        console.error('[customers GET]', err);
        return NextResponse.json({ error: err.message, meta: err.meta }, { status: 500 });
    }
});

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const data = customerCreateSchema.parse(body);

    const customer = await withCodeRetry('customer', 'KH', (code) =>
        prisma.customer.create({ data: { code, ...data, createdByRole: session?.user?.role || '' } })
    );

    return NextResponse.json(customer, { status: 201 });
});
