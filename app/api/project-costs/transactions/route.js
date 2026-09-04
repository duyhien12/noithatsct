import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { VIEW_ROLES } from '@/lib/financeJournal';

// Bảng chi tiết từng giao dịch Thu/Chi đã gắn Dự án — bản phẳng của /api/project-costs (vốn chỉ
// tổng hợp theo dự án), để xem trực tiếp từng khoản mà không cần bấm vào từng dự án.
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(`${searchParams.get('to')}T23:59:59.999Z`) : null;
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type'); // Thu | Chi
    const search = searchParams.get('search');

    const where = { deletedAt: null, projectId: { not: null } };
    if (from || to) {
        where.date = {};
        if (from) where.date.gte = from;
        if (to) where.date.lte = to;
    }
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    if (search) {
        where.OR = [
            { content: { contains: search, mode: 'insensitive' } },
            { objectName: { contains: search, mode: 'insensitive' } },
            { project: { code: { contains: search, mode: 'insensitive' } } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [rows, total] = await Promise.all([
        prisma.financeTransaction.findMany({
            where,
            orderBy: { date: 'desc' },
            skip,
            take: limit,
            select: {
                id: true, code: true, date: true, type: true, amount: true, department: true,
                objectType: true, objectName: true, content: true, status: true,
                project: { select: { id: true, code: true, name: true } },
            },
        }),
        prisma.financeTransaction.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(rows, total, { page, limit }));
}, { roles: VIEW_ROLES });
