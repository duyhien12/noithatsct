import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { employeeAdvanceCreateSchema } from '@/lib/validations/employeeAdvance';
import { computeBalance, ADVANCE_CATEGORY_BY_TYPE, DEFAULT_ADVANCE_CATEGORY } from '@/lib/employeeAdvance';
import { findOrphanAdvanceTransactions } from '@/lib/employeeAdvanceOrphans';
import { VIEW_ROLES, CREATE_ROLES } from '@/lib/financeJournal';
import { deriveCashFields } from '@/lib/financeJournal';

// Bảng tổng hợp tạm ứng theo TỪNG NHÂN VIÊN (không phải theo từng phiếu) — mỗi nhân viên có thể
// có nhiều EmployeeAdvance qua thời gian. Số dư luôn TÍNH từ Đầu kỳ + Phát sinh - Hoàn ứng - Khấu
// trừ lương, không cho nhập tay số dư cuối kỳ (đúng yêu cầu nghiệp vụ).
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(`${searchParams.get('to')}T23:59:59.999Z`) : null;
    const departmentId = searchParams.get('departmentId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // with_balance | settled
    const search = searchParams.get('search');

    const employeeWhere = { deletedAt: null };
    if (departmentId) employeeWhere.departmentId = departmentId;
    if (search) employeeWhere.name = { contains: search, mode: 'insensitive' };

    // Trang "Tạm ứng nhân viên" CHỈ hiển thị tạm ứng LƯƠNG — tạm ứng công tác/vật tư/tiền ăn có
    // sổ con riêng ở /finance/journal/advance-expenses.
    const advanceWhere = { advanceType: 'Lương', financeTransaction: { deletedAt: null } };
    if (projectId) advanceWhere.projectId = projectId;

    const [employees, advances, orphanAdvances] = await Promise.all([
        prisma.employee.findMany({
            where: employeeWhere,
            include: { department: { select: { id: true, name: true } } },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
        prisma.employeeAdvance.findMany({
            where: advanceWhere,
            include: { settlements: { where: { financeTransaction: { deletedAt: null } } } },
            orderBy: { date: 'asc' },
        }),
        // Phiếu Chi nhập trực tiếp trong Nhật ký (đúng danh mục "T/ứng lương", gắn đối tượng Nhân
        // viên) nhưng chưa qua modal "Tạo tạm ứng" — vẫn tính vào số dư tạm ứng của nhân viên đó.
        findOrphanAdvanceTransactions({ advanceTypes: ['Lương'] }),
    ]);

    const advancesByEmployee = new Map();
    for (const a of advances) {
        if (!advancesByEmployee.has(a.employeeId)) advancesByEmployee.set(a.employeeId, []);
        advancesByEmployee.get(a.employeeId).push(a);
    }
    for (const a of orphanAdvances) {
        if (projectId && a.project?.id !== projectId) continue;
        if (!advancesByEmployee.has(a.employeeId)) advancesByEmployee.set(a.employeeId, []);
        advancesByEmployee.get(a.employeeId).push(a);
    }

    let rows = employees.map(emp => {
        const empAdvances = advancesByEmployee.get(emp.id) || [];
        const allSettlements = empAdvances.flatMap(a => a.settlements);

        const beforeAdvances = from ? empAdvances.filter(a => a.date < from) : [];
        const beforeSettlements = from ? allSettlements.filter(s => s.date < from) : [];
        const opening = computeBalance(emp.openingAdvanceBalance || 0, beforeAdvances, beforeSettlements).closingBalance;

        const periodAdvances = empAdvances.filter(a => (!from || a.date >= from) && (!to || a.date <= to));
        const periodSettlements = allSettlements.filter(s => (!from || s.date >= from) && (!to || s.date <= to));
        const period = computeBalance(opening, periodAdvances, periodSettlements);

        // Số dư thực tế hiện tại (không phụ thuộc bộ lọc kỳ) — dùng để xác định trạng thái còn dư/tất toán.
        const current = computeBalance(emp.openingAdvanceBalance || 0, empAdvances, allSettlements).closingBalance;

        const lastAdvance = empAdvances.length ? empAdvances.reduce((m, a) => (a.date > m.date ? a : m)) : null;

        return {
            employeeId: emp.id, employeeCode: emp.code, employeeName: emp.name,
            departmentId: emp.departmentId, departmentName: emp.department?.name || '',
            openingBalance: opening,
            periodAdvance: period.totalAdvance,
            periodReturned: period.totalReturned,
            periodDeducted: period.totalDeducted,
            closingBalance: period.closingBalance,
            currentBalance: current,
            lastAdvanceDate: lastAdvance?.date || null,
            status: current > 0 ? 'with_balance' : 'settled',
        };
    });

    if (status) rows = rows.filter(r => r.status === status);
    // Ẩn nhân viên chưa từng tạm ứng và không còn dư (bảng chỉ có ý nghĩa với người có phát sinh).
    rows = rows.filter(r => r.currentBalance !== 0 || r.periodAdvance > 0 || r.periodReturned > 0 || r.periodDeducted > 0 || r.openingBalance !== 0);

    const total = rows.length;
    const paged = rows.slice(skip, skip + limit);

    const dashboard = {
        totalOutstanding: rows.reduce((s, r) => s + r.currentBalance, 0),
        periodAdvance: rows.reduce((s, r) => s + r.periodAdvance, 0),
        periodReturned: rows.reduce((s, r) => s + r.periodReturned + r.periodDeducted, 0),
        employeesWithBalance: rows.filter(r => r.currentBalance > 0).length,
    };

    const result = paginatedResponse(paged, total, { page, limit });
    result.dashboard = dashboard;
    return NextResponse.json(result);
}, { roles: VIEW_ROLES });

// Tạo tạm ứng mới — TẠO ĐÚNG 1 FinanceTransaction (Chi) + 1 EmployeeAdvance trong 1 transaction DB.
// Không có đường nào khác tạo dòng Chi tạm ứng ngoài luồng này.
export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = employeeAdvanceCreateSchema.parse(body);

    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId }, select: { id: true, name: true } });
    if (!employee) return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });

    const cash = deriveCashFields('Chi', data.method, data.amount);
    // Gắn đúng danh mục "Tạm ứng" trong Nhật ký Thu – Chi để phiếu hiện đúng ở các báo cáo lọc theo
    // danh mục (VD sổ con Tạm ứng công tác/vật tư/tiền ăn) — không chặn tạo tạm ứng nếu thiếu danh mục.
    const advanceCategory = await prisma.financeCategory.findFirst({
        where: { name: ADVANCE_CATEGORY_BY_TYPE[data.advanceType] || DEFAULT_ADVANCE_CATEGORY },
        select: { id: true },
    });

    const result = await prisma.$transaction(async (tx) => {
        const financeTx = await withCodeRetry('financeTransaction', 'PC', (code) =>
            tx.financeTransaction.create({
                data: {
                    code,
                    date: data.date,
                    type: 'Chi',
                    method: data.method,
                    amount: data.amount,
                    ...cash,
                    department: data.department,
                    projectId: data.projectId || null,
                    content: data.content,
                    detail: `Tạm ứng ${data.advanceType.toLowerCase()} — ${employee.name}`,
                    categoryId: advanceCategory?.id || null,
                    debitAccountId: data.debitAccountId,
                    creditAccountId: data.creditAccountId,
                    bankAccountId: data.method === 'Chuyển khoản' ? data.bankAccountId : null,
                    cashFundId: data.method === 'Tiền mặt' ? data.cashFundId : null,
                    objectType: 'Nhân viên',
                    objectId: data.employeeId,
                    objectName: employee.name,
                    documentNo: data.documentNo,
                    documentDate: data.documentDate,
                    attachments: data.attachments,
                    notes: data.notes,
                    status: 'Đã hạch toán',
                    createdBy: session.user.name,
                    createdById: session.user.id,
                    createdByRole: session.user.role,
                },
            }), 5
        );

        await tx.financeTransactionAudit.create({
            data: {
                transactionId: financeTx.id, action: 'create',
                actorName: session.user.name, actorId: session.user.id, actorRole: session.user.role,
                reason: `Tạm ứng nhân viên ${employee.name}`, afterData: financeTx,
            },
        });

        const advance = await withCodeRetry('employeeAdvance', 'TU', (code) =>
            tx.employeeAdvance.create({
                data: {
                    code,
                    employeeId: data.employeeId,
                    projectId: data.projectId || null,
                    advanceType: data.advanceType,
                    amount: data.amount,
                    date: data.date,
                    content: data.content,
                    notes: data.notes,
                    createdBy: session.user.name,
                    financeTransactionId: financeTx.id,
                },
                include: { employee: { select: { id: true, name: true, code: true } }, project: { select: { id: true, name: true, code: true } }, financeTransaction: true },
            }), 5
        );

        return advance;
    });

    return NextResponse.json(result, { status: 201 });
}, { roles: CREATE_ROLES });
