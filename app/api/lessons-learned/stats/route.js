import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { VIEW_ROLES, STATUSES } from '@/lib/lessonLearned';

export const GET = withAuth(async () => {
    const [total, statusCounts, categoryGroups, causeGroups, monthlyRaw] = await Promise.all([
        prisma.lessonLearned.count(),
        prisma.lessonLearned.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.lessonLearned.groupBy({ by: ['category'], _count: { _all: true }, orderBy: { _count: { category: 'desc' } }, take: 5 }),
        prisma.lessonLearned.groupBy({
            by: ['cause'],
            where: { cause: { not: '' } },
            _count: { _all: true },
            orderBy: { _count: { cause: 'desc' } },
            take: 10,
        }),
        prisma.$queryRaw`
            SELECT to_char("occurredAt", 'YYYY-MM') AS month, COUNT(*)::int AS count
            FROM "LessonLearned"
            WHERE "deletedAt" IS NULL AND "occurredAt" >= (CURRENT_DATE - INTERVAL '11 months')
            GROUP BY month
            ORDER BY month ASC
        `,
    ]);

    const byStatus = Object.fromEntries(STATUSES.map(s => [s, 0]));
    for (const g of statusCounts) byStatus[g.status] = g._count._all;

    const topCategories = categoryGroups.map(g => ({ category: g.category, count: g._count._all }));
    const topCauses = causeGroups.map(g => ({ cause: g.cause, count: g._count._all }));

    // Đảm bảo đủ 12 tháng liên tiếp kể cả tháng không có dữ liệu
    const monthMap = Object.fromEntries(monthlyRaw.map(r => [r.month, r.count]));
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({ month: key, count: monthMap[key] || 0 });
    }

    return NextResponse.json({
        total,
        byStatus,
        topCategories,
        topCauses,
        monthly: months,
    });
}, { roles: VIEW_ROLES });
