import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { transactionCreateSchema } from '@/lib/validations/transaction';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const type = searchParams.get('type');

    const where = {};
    if (type) where.type = type;

    const [txList, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            include: { project: { select: { name: true } } },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),
        prisma.transaction.count({ where }),
    ]);
    const transactions = paginatedResponse(txList, total, { page, limit });

    // All summary queries in parallel
    const [receivables, payables, income, expense, expApproved, expPaid, expPending] = await Promise.all([
        prisma.contractPayment.aggregate({ _sum: { amount: true, paidAmount: true } }),
        prisma.contractorPayment.aggregate({ _sum: { contractAmount: true, paidAmount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { status: { not: 'Từ chối' } }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { status: { in: ['Đã chi', 'Hoàn thành'] } }, _sum: { amount: true } }),
        prisma.projectExpense.aggregate({ where: { status: 'Chờ duyệt' }, _sum: { amount: true } }),
    ]);

    const totalExpenseApproved = expApproved._sum.amount || 0;
    const totalExpensePaid = expPaid._sum.amount || 0;
    const totalExpensePending = expPending._sum.amount || 0;

    return NextResponse.json({
        transactions,
        summary: {
            totalReceivable: receivables._sum.amount || 0,
            totalReceived: receivables._sum.paidAmount || 0,
            receivableOutstanding: (receivables._sum.amount || 0) - (receivables._sum.paidAmount || 0),
            totalPayable: payables._sum.contractAmount || 0,
            totalPaid: payables._sum.paidAmount || 0,
            payableOutstanding: (payables._sum.contractAmount || 0) - (payables._sum.paidAmount || 0),
            totalExpenseApproved,
            totalExpensePaid,
            totalExpensePending,
            manualIncome: income._sum.amount || 0,
            manualExpense: expense._sum.amount || 0,
            netCashflow: (receivables._sum.paidAmount || 0) + (income._sum.amount || 0)
                - (payables._sum.paidAmount || 0) - totalExpensePaid - (expense._sum.amount || 0),
        },
    });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const validated = transactionCreateSchema.parse(body);

    const tx = await withCodeRetry('transaction', 'GD', (code) =>
        prisma.transaction.create({
            data: {
                code,
                type: validated.type,
                description: validated.description,
                amount: validated.amount,
                category: validated.category,
                date: validated.date || new Date(),
                projectId: validated.projectId,
            },
        })
    );
    return NextResponse.json(tx, { status: 201 });
});
