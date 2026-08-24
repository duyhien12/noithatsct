import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { financeTransactionCreateSchema } from '@/lib/validations/financeTransaction';
import { VIEW_ROLES, CREATE_ROLES, deriveCashFields, getCategoryDescendantIds } from '@/lib/financeJournal';

const INCLUDE = {
    project: { select: { id: true, name: true, code: true } },
    category: { select: { id: true, name: true, group: true } },
    debitAccount: { select: { id: true, code: true, name: true } },
    creditAccount: { select: { id: true, code: true, name: true } },
    bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
    cashFund: { select: { id: true, name: true } },
};

function buildWhere(searchParams) {
    const where = searchParams.get('deleted') === '1' ? { deletedAt: { not: null } } : { deletedAt: null };
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(`${to}T23:59:59.999Z`);
    }
    const department = searchParams.get('department');
    if (department) where.department = department;
    const type = searchParams.get('type');
    if (type) where.type = type;
    const method = searchParams.get('method');
    if (method) where.method = method;
    const projectId = searchParams.get('projectId');
    if (projectId) where.projectId = projectId;
    const splitGroupId = searchParams.get('splitGroupId');
    if (splitGroupId) where.splitGroupId = splitGroupId;
    const transferGroupId = searchParams.get('transferGroupId');
    if (transferGroupId) where.transferGroupId = transferGroupId;
    const objectId = searchParams.get('objectId');
    if (objectId) where.objectId = objectId;
    const debitAccountId = searchParams.get('debitAccountId');
    if (debitAccountId) where.debitAccountId = debitAccountId;
    const creditAccountId = searchParams.get('creditAccountId');
    if (creditAccountId) where.creditAccountId = creditAccountId;
    const bankAccountId = searchParams.get('bankAccountId');
    if (bankAccountId) where.bankAccountId = bankAccountId;
    const cashFundId = searchParams.get('cashFundId');
    if (cashFundId) where.cashFundId = cashFundId;
    const status = searchParams.get('status');
    if (status) where.status = status;
    // Lọc theo cột — dùng chung 1 ô "Lọc theo cột" ở FilterBar (khác với ô tìm kiếm chung `search`
    // ở dưới vốn quét nhiều field cùng lúc): mỗi field dưới đây lọc contains đúng 1 cột cụ thể.
    const code = searchParams.get('code');
    if (code) where.code = { contains: code, mode: 'insensitive' };
    const content = searchParams.get('content');
    if (content) where.content = { contains: content, mode: 'insensitive' };
    const objectName = searchParams.get('objectName');
    if (objectName) where.objectName = { contains: objectName, mode: 'insensitive' };
    const payerReceiver = searchParams.get('payerReceiver');
    if (payerReceiver) where.payerReceiver = { contains: payerReceiver, mode: 'insensitive' };
    const itemName = searchParams.get('itemName');
    if (itemName) where.itemName = { contains: itemName, mode: 'insensitive' };
    const itemUnit = searchParams.get('itemUnit');
    if (itemUnit) where.itemUnit = { contains: itemUnit, mode: 'insensitive' };
    const search = searchParams.get('search');
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { detail: { contains: search, mode: 'insensitive' } },
            { documentNo: { contains: search, mode: 'insensitive' } },
            { objectName: { contains: search, mode: 'insensitive' } },
            { payerReceiver: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }
    return where;
}

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const where = buildWhere(searchParams);

    // Chọn 1 danh mục ở nhóm cấp 1/2 thì lọc gộp luôn tất cả danh mục con cháu của nó
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
        const categories = await prisma.financeCategory.findMany({ select: { id: true, parentId: true } });
        where.categoryId = { in: getCategoryDescendantIds(categoryId, categories) };
    }

    const [data, total, agg, byCashFund, byBankAccount] = await Promise.all([
        prisma.financeTransaction.findMany({
            where,
            include: INCLUDE,
            orderBy: [{ createdAt: 'desc' }],
            skip,
            take: limit,
        }),
        prisma.financeTransaction.count({ where }),
        prisma.financeTransaction.aggregate({
            where,
            _sum: { cashIn: true, cashOut: true, bankIn: true, bankOut: true },
        }),
        prisma.financeTransaction.groupBy({
            by: ['cashFundId'],
            where: { ...where, cashFundId: { not: null } },
            _sum: { cashIn: true, cashOut: true },
        }),
        prisma.financeTransaction.groupBy({
            by: ['bankAccountId'],
            where: { ...where, bankAccountId: { not: null } },
            _sum: { bankIn: true, bankOut: true },
        }),
    ]);

    const totalCashIn = agg._sum.cashIn || 0;
    const totalCashOut = agg._sum.cashOut || 0;
    const totalBankIn = agg._sum.bankIn || 0;
    const totalBankOut = agg._sum.bankOut || 0;

    // Số phiếu hiển thị: đánh số liên tục từ 1 theo từng loại (PT/PC), bỏ qua phiếu đã xóa,
    // tính trên toàn bộ giao dịch còn hiệu lực (không phụ thuộc filter/phân trang hiện tại)
    // để thứ tự luôn ổn định. Không đổi cột `code` gốc lưu trong DB.
    const neededIds = new Set(data.map(t => t.id));
    if (neededIds.size > 0) {
        const allActive = await prisma.financeTransaction.findMany({
            where: { deletedAt: null },
            select: { id: true, type: true },
            orderBy: { createdAt: 'asc' },
        });
        const counters = {};
        const rankById = {};
        for (const t of allActive) {
            counters[t.type] = (counters[t.type] || 0) + 1;
            if (neededIds.has(t.id)) rankById[t.id] = counters[t.type];
        }
        data.forEach(t => {
            const rank = rankById[t.id];
            const prefix = t.type === 'Thu' ? 'PT' : 'PC';
            t.displayCode = rank ? `${prefix}${String(rank).padStart(5, '0')}` : t.code;
        });
    }

    const result = paginatedResponse(data, total, { page, limit });
    result.summary = {
        totalCashIn,
        totalCashOut,
        totalBankIn,
        totalBankOut,
        netCashFlow: totalCashIn + totalBankIn - totalCashOut - totalBankOut,
        byCashFund: byCashFund.map(g => ({ cashFundId: g.cashFundId, cashIn: g._sum.cashIn || 0, cashOut: g._sum.cashOut || 0 })),
        byBankAccount: byBankAccount.map(g => ({ bankAccountId: g.bankAccountId, bankIn: g._sum.bankIn || 0, bankOut: g._sum.bankOut || 0 })),
    };
    return NextResponse.json(result);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = financeTransactionCreateSchema.parse(body);

    const cash = deriveCashFields(data.type, data.method, data.amount);
    const itemAmount = (data.itemQty || 0) * (data.itemUnitPrice || 0);
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null));

    const prefix = data.type === 'Thu' ? 'PT' : 'PC';
    const created = await withCodeRetry('financeTransaction', prefix, (code) =>
        prisma.financeTransaction.create({
            data: {
                code,
                ...cleanData,
                ...cash,
                itemAmount,
                createdBy: session.user.name,
                createdById: session.user.id,
                createdByRole: session.user.role,
            },
            include: INCLUDE,
        }), 5
    );

    await prisma.financeTransactionAudit.create({
        data: {
            transactionId: created.id,
            action: 'create',
            actorName: session.user.name,
            actorId: session.user.id,
            actorRole: session.user.role,
            afterData: created,
        },
    });

    return NextResponse.json(created, { status: 201 });
}, { roles: CREATE_ROLES });
