import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where = {};
    if (department) where.department = department;
    if (category) where.category = category;
    if (from || to) {
        where.entryDate = {};
        if (from) where.entryDate.gte = new Date(from);
        if (to) where.entryDate.lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
        prisma.larkJournalEntry.findMany({
            where,
            orderBy: { entryDate: 'desc' },
            take: 500,
        }),
        prisma.larkJournalEntry.count({ where }),
    ]);

    const summary = await prisma.larkJournalEntry.aggregate({
        where,
        _sum: { cashIn: true, cashOut: true, bankIn: true, bankOut: true },
    });

    return NextResponse.json({
        entries,
        total,
        summary: {
            totalCashIn: summary._sum.cashIn || 0,
            totalCashOut: summary._sum.cashOut || 0,
            totalBankIn: summary._sum.bankIn || 0,
            totalBankOut: summary._sum.bankOut || 0,
            netCash: (summary._sum.cashIn || 0) - (summary._sum.cashOut || 0),
            netBank: (summary._sum.bankIn || 0) - (summary._sum.bankOut || 0),
        },
    });
});
