import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { VIEW_ROLES } from '@/lib/financeJournal';
import { OPERATIONAL_ADVANCE_TYPES } from '@/lib/employeeAdvance';

// Sổ con "Tạm ứng công tác/vật tư/tiền ăn" — lấy dữ liệu TRỰC TIẾP từ bảng Tổng hợp Thu – Chi
// (FinanceTransaction, nguồn chân lý duy nhất), chỉ join sang EmployeeAdvance để biết loại tạm ứng
// và số dư còn lại (mỗi tạm ứng luôn có đúng 1 FinanceTransaction Chi gốc — quan hệ advanceOf).
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(`${searchParams.get('to')}T23:59:59.999Z`) : null;
    const department = searchParams.get('department');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // open | settled
    const search = searchParams.get('search');
    const typesParam = searchParams.get('types');
    const types = typesParam ? typesParam.split(',').filter(Boolean) : OPERATIONAL_ADVANCE_TYPES;

    const where = {
        deletedAt: null,
        type: 'Chi',
        advanceOf: { advanceType: { in: types } },
        ...(department && { department }),
        ...(projectId && { projectId }),
        ...((from || to) && { date: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
        ...(search && {
            OR: [
                { objectName: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const transactions = await prisma.financeTransaction.findMany({
        where,
        include: {
            project: { select: { id: true, code: true, name: true } },
            advanceOf: {
                include: {
                    employee: { select: { id: true, name: true, code: true } },
                    settlements: { select: { id: true, amount: true, settleType: true, date: true } },
                },
            },
        },
        orderBy: { date: 'desc' },
    });

    let rows = transactions.map(t => {
        const advance = t.advanceOf;
        const settledAmount = advance.settlements.reduce((s, x) => s + x.amount, 0);
        const remaining = advance.amount - settledAmount;
        return {
            id: advance.id, code: t.code, date: t.date,
            employeeId: advance.employee.id, employeeName: advance.employee.name, employeeCode: advance.employee.code,
            department: t.department,
            advanceType: advance.advanceType, content: t.content,
            project: t.project ? { id: t.project.id, code: t.project.code, name: t.project.name } : null,
            amount: t.amount, settledAmount, remaining,
            status: remaining > 0.01 ? 'open' : 'settled',
            settlements: advance.settlements,
            financeTransactionCode: t.code,
            attachments: t.attachments || [],
        };
    });

    if (status) rows = rows.filter(r => r.status === status);

    const total = rows.length;
    const paged = rows.slice(skip, skip + limit);

    const dashboard = {
        totalAdvance: rows.reduce((s, r) => s + r.amount, 0),
        totalSettled: rows.reduce((s, r) => s + r.settledAmount, 0),
        totalOutstanding: rows.reduce((s, r) => s + r.remaining, 0),
        openCount: rows.filter(r => r.status === 'open').length,
    };

    const result = paginatedResponse(paged, total, { page, limit });
    result.dashboard = dashboard;
    return NextResponse.json(result);
}, { roles: VIEW_ROLES });
