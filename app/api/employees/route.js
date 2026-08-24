import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { employeeCreateSchema } from '@/lib/validations/employee';

// Bỏ dấu tiếng Việt + hạ chữ thường, để so khớp không phân biệt hoa/thường và có dấu/không dấu.
const COMBINING_MARKS = /[̀-ͯ]/g;
function normalizeVi(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD').replace(COMBINING_MARKS, '')
        .replace(/đ/g, 'd');
}

// Cho phép gõ chữ cái đầu của từng từ trong tên (VD: "nvt" → "Nguyễn Văn Tuấn"),
// bên cạnh tìm theo chuỗi con thông thường (VD: "tuấn").
function matchesEmployeeSearch(name, search) {
    const normSearch = normalizeVi(search).trim();
    if (!normSearch) return true;
    const normName = normalizeVi(name);
    if (normName.includes(normSearch)) return true;
    const initials = normName.split(/\s+/).filter(Boolean).map(w => w[0]).join('');
    return initials.includes(normSearch);
}

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const departmentId = searchParams.get('departmentId');
    const search = searchParams.get('search');

    const where = {};
    if (departmentId) where.departmentId = departmentId;

    const [employees, rawDepts, empCounts] = await Promise.all([
        prisma.employee.findMany({
            where,
            include: { department: { select: { name: true } } },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
        prisma.department.findMany({ orderBy: { name: 'asc' } }),
        // Count only active (non-deleted) employees per department
        prisma.employee.groupBy({
            by: ['departmentId'],
            where: { deletedAt: null },
            _count: { id: true },
        }),
    ]);
    const filtered = search ? employees.filter(e => matchesEmployeeSearch(e.name, search)) : employees;
    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit);
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
    const last = await prisma.employee.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    const sortOrder = (last?.sortOrder || 0) + 10;
    const employee = await withCodeRetry('employee', 'NV', (code) =>
        prisma.employee.create({ data: { code, sortOrder, ...data } })
    );
    return NextResponse.json(employee, { status: 201 });
});
