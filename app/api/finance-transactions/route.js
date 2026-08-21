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
    const objectId = searchParams.get('objectId');
    if (objectId) where.objectId = objectId;
    const debitAccountId = searchParams.get('debitAccountId');
    if (debitAccountId) where.debitAccountId = debitAccountId;
    const creditAccountId = searchParams.get('creditAccountId');
    if (creditAccountId) where.creditAccountId = creditAccountId;
    const status = searchParams.get('status');
    if (status) where.status = status;
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

    const [data, total, agg] = await Promise.all([
        prisma.financeTransaction.findMany({
            where,
            include: INCLUDE,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            skip,
            take: limit,
        }),
        prisma.financeTransaction.count({ where }),
        prisma.financeTransaction.aggregate({
            where,
            _sum: { cashIn: true, cashOut: true, bankIn: true, bankOut: true },
        }),
    ]);

    const totalCashIn = agg._sum.cashIn || 0;
    const totalCashOut = agg._sum.cashOut || 0;
    const totalBankIn = agg._sum.bankIn || 0;
    const totalBankOut = agg._sum.bankOut || 0;

    const result = paginatedResponse(data, total, { page, limit });
    result.summary = {
        totalCashIn,
        totalCashOut,
        totalBankIn,
        totalBankOut,
        netCashFlow: totalCashIn + totalBankIn - totalCashOut - totalBankOut,
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
