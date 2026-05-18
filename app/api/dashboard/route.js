import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const DASHBOARD_ROLES = ['ban_gd', 'giam_doc', 'pho_gd'];
const ADMIN_EMAIL = 'admin@kientrucsct.com';

const HOLDER_BY_STATUS = {
    'Chờ duyệt':      'KT trưởng / GĐ',
    'Đã duyệt':       'KT thực hiện chi',
    'Chờ thanh toán': 'Bên nhận tiền',
};

export const GET = withAuth(async (request, context, session) => {
    const role = session?.user?.role;
    const email = session?.user?.email;
    if (!DASHBOARD_ROLES.includes(role) && email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 365);

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - days);

    // Quarter start
    const quarterStart = new Date(now);
    quarterStart.setMonth(Math.floor(quarterStart.getMonth() / 3) * 3, 1);
    quarterStart.setHours(0, 0, 0, 0);

    const dateFilter = days === 90 ? quarterStart : periodStart;

    const safe = (p, fallback) => p.catch(() => fallback);

    const [
        // Legacy stats
        customerCount, projectCount, productCount, contractCount, workOrderCount,
        income, expense, activeProjects, pendingWorkOrders, contractValueAgg,
        recentProjects, projectsByStatus, lowStockProducts,
        // CFO data
        expense30dAgg,
        recentTransactions,
        pendingExpensesRaw,
        expenseByCategoryRaw,
        profitProjects,
    ] = await Promise.all([
        safe(prisma.customer.count(), 0),
        safe(prisma.project.count(), 0),
        safe(prisma.product.count(), 0),
        safe(prisma.contract.count(), 0),
        safe(prisma.workOrder.count(), 0),
        safe(prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
        safe(prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }), { _sum: { amount: 0 } }),
        safe(prisma.project.count({ where: { status: { in: ['Thi công', 'Thiết kế', 'Đang thi công'] } } }), 0),
        safe(prisma.workOrder.count({ where: { status: 'Chờ xử lý' } }), 0),
        safe(prisma.contract.aggregate({ _sum: { contractValue: true, paidAmount: true } }), { _sum: { contractValue: 0, paidAmount: 0 } }),
        safe(prisma.project.findMany({
            take: 5, orderBy: { updatedAt: 'desc' },
            include: { customer: { select: { name: true } } },
        }), []),
        safe(prisma.project.groupBy({ by: ['status'], _count: true }), []),
        safe(prisma.product.findMany({
            where: { stock: 0, supplyType: { not: 'Dịch vụ' } },
            select: { id: true, name: true, code: true, stock: true, minStock: true, category: true, image: true },
            take: 10,
        }), []),
        // 30-day expense for burn rate
        safe(prisma.transaction.aggregate({
            where: { type: 'Chi', date: { gte: new Date(Date.now() - 30 * 86400000) } },
            _sum: { amount: true },
        }), { _sum: { amount: 0 } }),
        // Transactions for cashflow timeline
        safe(prisma.transaction.findMany({
            where: { date: { gte: dateFilter } },
            select: { type: true, amount: true, date: true, category: true },
            orderBy: { date: 'asc' },
        }), []),
        // Pending expenses for bottleneck + payable + blocked
        safe(prisma.projectExpense.findMany({
            where: {
                status: { in: ['Chờ duyệt', 'Đã duyệt', 'Chờ thanh toán'] },
                deletedAt: null,
            },
            select: { status: true, amount: true, createdAt: true, submittedBy: true },
        }), []),
        // Expense heatmap by category for period
        safe(prisma.projectExpense.groupBy({
            by: ['category'],
            where: { deletedAt: null, date: { gte: dateFilter } },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
        }), []),
        // Project profitability (projects with financials)
        safe(prisma.project.findMany({
            where: { deletedAt: null, contractValue: { gt: 0 } },
            select: { id: true, code: true, name: true, contractValue: true, spent: true, budget: true, status: true },
            orderBy: { contractValue: 'desc' },
            take: 10,
        }), []),
    ]);

    // --- Derived CFO metrics ---
    const totalRevenue = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;
    const cashBalance  = totalRevenue - totalExpense;

    const totalContractValue = contractValueAgg._sum.contractValue || 0;
    const totalPaid          = contractValueAgg._sum.paidAmount || 0;
    const receivable         = Math.max(0, totalContractValue - totalPaid);

    const payable = pendingExpensesRaw.reduce((s, e) => s + e.amount, 0);
    const blocked = pendingExpensesRaw.filter(e => e.status === 'Chờ duyệt');
    const blockedAmount = blocked.reduce((s, e) => s + e.amount, 0);
    const blockedCount  = blocked.length;

    const burnRate30d = (expense30dAgg._sum.amount || 0) / 30;
    const runwayDays  = burnRate30d > 0 ? Math.round(cashBalance / burnRate30d) : 9999;

    // Approval bottleneck grouped by status
    const bottleneckMap = {};
    const today = new Date();
    pendingExpensesRaw.forEach(e => {
        if (!bottleneckMap[e.status]) bottleneckMap[e.status] = { count: 0, total: 0, totalDays: 0 };
        bottleneckMap[e.status].count++;
        bottleneckMap[e.status].total += e.amount;
        const d = Math.floor((today - new Date(e.createdAt)) / 86400000);
        bottleneckMap[e.status].totalDays += d;
    });
    const approvalBottleneck = Object.entries(bottleneckMap).map(([status, b]) => ({
        status,
        holder: HOLDER_BY_STATUS[status] || status,
        count: b.count,
        total: b.total,
        avgDays: b.count > 0 ? Math.round(b.totalDays / b.count) : 0,
    })).sort((a, b) => b.total - a.total);

    // Cashflow timeline — group by day
    const dailyMap = {};
    recentTransactions.forEach(tx => {
        const d = new Date(tx.date).toISOString().split('T')[0];
        if (!dailyMap[d]) dailyMap[d] = { thu: 0, chi: 0 };
        if (tx.type === 'Thu') dailyMap[d].thu += tx.amount;
        else dailyMap[d].chi += tx.amount;
    });
    const cashflowTimeline = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({ date, thu: d.thu, chi: d.chi, net: d.thu - d.chi }));

    // Expense heatmap
    const totalHeatmap = expenseByCategoryRaw.reduce((s, r) => s + (r._sum.amount || 0), 0);
    const expenseHeatmap = expenseByCategoryRaw
        .filter(r => r._sum.amount > 0)
        .map(r => ({
            category: r.category,
            amount: r._sum.amount || 0,
            count: r._count,
            pct: totalHeatmap > 0 ? Math.round((r._sum.amount / totalHeatmap) * 100) : 0,
        }))
        .slice(0, 8);

    // Project profitability
    const projectProfitability = profitProjects.map(p => {
        const revenue = p.contractValue;
        const cost    = p.spent || 0;
        const profit  = revenue - cost;
        const margin  = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
        return { id: p.id, code: p.code, name: p.name, revenue, cost, profit, margin, status: p.status, overBudget: p.budget > 0 && cost > p.budget };
    });

    const overBudgetCount = projectProfitability.filter(p => p.overBudget).length;
    const negativeMarginCount = projectProfitability.filter(p => p.margin < 0).length;

    return NextResponse.json({
        // Legacy
        stats: {
            revenue: totalRevenue,
            expense: totalExpense,
            projects: projectCount,
            activeProjects,
            customers: customerCount,
            products: productCount,
            contracts: contractCount,
            workOrders: workOrderCount,
            pendingWorkOrders,
            totalContractValue,
            totalPaid,
        },
        recentProjects,
        projectsByStatus,
        lowStockProducts,
        // CFO
        cfo: {
            cashBalance,
            receivable,
            payable,
            blockedAmount,
            blockedCount,
            burnRate30d,
            runwayDays,
            approvalBottleneck,
            cashflowTimeline,
            expenseHeatmap,
            projectProfitability,
            overBudgetCount,
            negativeMarginCount,
            periodDays: days,
        },
    });
});
