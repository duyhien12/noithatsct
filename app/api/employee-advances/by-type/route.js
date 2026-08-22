import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { VIEW_ROLES, getCategoryDescendantIds } from '@/lib/financeJournal';
import { DEFAULT_ADVANCE_CATEGORY, OPERATIONAL_ADVANCE_TYPES } from '@/lib/employeeAdvance';

// Sổ con "Tạm ứng công tác/vật tư/tiền ăn" — lấy dữ liệu TRỰC TIẾP từ bảng Tổng hợp Thu – Chi
// (FinanceTransaction, nguồn chân lý duy nhất). Một phiếu Chi được coi là tạm ứng thuộc sổ này khi:
// (a) tạo qua modal "Tạo tạm ứng" — có liên kết advanceOf, HOẶC
// (b) nhập trực tiếp trong Nhật ký Thu – Chi với danh mục "T/ứng VT+ ăn+ c/tác" (không bắt buộc phải
//     qua modal — kế toán vẫn hay nhập thẳng ở Nhật ký chính).
// Chỉ join sang EmployeeAdvance (khi có) để biết loại tạm ứng cụ thể và số dư còn lại/hoàn ứng.
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

    const advanceCategory = await prisma.financeCategory.findFirst({ where: { name: DEFAULT_ADVANCE_CATEGORY }, select: { id: true } });
    let categoryIds = [];
    if (advanceCategory) {
        const allCategories = await prisma.financeCategory.findMany({ select: { id: true, parentId: true } });
        categoryIds = getCategoryDescendantIds(advanceCategory.id, allCategories);
    }

    // "Thuộc sổ này" = tạo qua modal với đúng loại Công tác/Vật tư/Tiền ăn (loại khác như Lương bị
    // loại trừ dù có advanceOf), HOẶC nhập tay trong Nhật ký với danh mục "T/ứng VT+ ăn+ c/tác"
    // (không phân loại được cụ thể nhưng vẫn đúng phạm vi danh mục của sổ này).
    const and = [
        { deletedAt: null },
        { type: 'Chi' },
        { OR: [
            { advanceOf: { advanceType: { in: types } } },
            ...(categoryIds.length ? [{ categoryId: { in: categoryIds } }] : []),
        ] },
    ];
    if (department) and.push({ department });
    if (projectId) and.push({ projectId });
    if (from || to) and.push({ date: { ...(from && { gte: from }), ...(to && { lte: to }) } });
    if (search) {
        and.push({ OR: [
            { objectName: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
        ] });
    }

    const transactions = await prisma.financeTransaction.findMany({
        where: { AND: and },
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
        const settledAmount = advance ? advance.settlements.reduce((s, x) => s + x.amount, 0) : 0;
        const remaining = advance ? advance.amount - settledAmount : t.amount;
        return {
            id: t.id, advanceId: advance?.id || null, code: t.code, date: t.date,
            employeeId: advance?.employee?.id || null,
            employeeName: advance?.employee?.name || t.objectName || '—',
            employeeCode: advance?.employee?.code || '',
            department: t.department,
            advanceType: advance?.advanceType || null, content: t.content,
            project: t.project ? { id: t.project.id, code: t.project.code, name: t.project.name } : null,
            amount: t.amount, settledAmount, remaining,
            status: remaining > 0.01 ? 'open' : 'settled',
            settlements: advance?.settlements || [],
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
