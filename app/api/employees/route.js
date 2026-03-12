import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { employeeCreateSchema } from '@/lib/validations/employee';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const departmentId = searchParams.get('departmentId');
    const search = searchParams.get('search');

    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total, rawDepts, empCounts] = await Promise.all([
        prisma.employee.findMany({
            where,
            include: { department: { select: { name: true } } },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.employee.count({ where }),
        prisma.department.findMany({ orderBy: { name: 'asc' } }),
        // Count only active (non-deleted) employees per department
        prisma.employee.groupBy({
            by: ['departmentId'],
            where: { deletedAt: null },
            _count: { id: true },
        }),
    ]);
    const countMap = Object.fromEntries(empCounts.map(e => [e.departmentId, e._count.id]));
    const departments = rawDepts.map(d => ({ ...d, _count: { employees: countMap[d.id] || 0 } }));
    return NextResponse.json({
        ...paginatedResponse(data, total, { page, limit }),
        departments,
    });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = employeeCreateSchema.parse(body);
    const code = await generateCode('employee', 'NV');
    const employee = await prisma.employee.create({
        data: { code, ...data },
    });
    return NextResponse.json(employee, { status: 201 });
});
