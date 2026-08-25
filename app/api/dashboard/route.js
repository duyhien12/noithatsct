import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { BALANCE_STATUS } from '@/lib/financeJournal';

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

    // Ký quỹ (bảo lãnh dự thầu/hợp đồng, bảo hành công trình) là tiền đặt cọc có thể
    // thu hồi — không phải doanh thu/chi phí thực của công ty, nên loại khỏi P&L
    // (stats.revenue/expense) dù vẫn tính vào Cash Balance/Burn Rate (tiền vẫn ra/vào quỹ thật).
    const kyQuyParents = await prisma.financeCategory.findMany({ where: { name: 'Ký quỹ', level: 1 }, select: { id: true } });
    const kyQuyParentIds = kyQuyParents.map(c => c.id);
    const kyQuyChildren = kyQuyParentIds.length
        ? await prisma.financeCategory.findMany({ where: { parentId: { in: kyQuyParentIds } }, select: { id: true } })
        : [];
    const kyQuyCategoryIds = [...kyQuyParentIds, ...kyQuyChildren.map(c => c.id)];

    const [
        // Legacy stats
        customerCount, projectCount, productCount, contractCount, workOrderCount,
        income, expense, incomePL, expensePL, activeProjects, pendingWorkOrders, contractValueAgg,
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
        // Thu/Chi thực tế (bao gồm ký quỹ) — dùng cho Cash Balance/Burn Rate
        safe(prisma.financeTransaction.aggregate({
            where: { status: BALANCE_STATUS, deletedAt: null },
            _sum: { cashIn: true, bankIn: true },
        }), { _sum: { cashIn: 0, bankIn: 0 } }),
        safe(prisma.financeTransaction.aggregate({
            where: { status: BALANCE_STATUS, deletedAt: null },
            _sum: { cashOut: true, bankOut: true },
        }), { _sum: { cashOut: 0, bankOut: 0 } }),
        // Doanh thu/Chi phí P&L (loại trừ Ký quỹ) — dùng cho stats.revenue/expense.
        // OR categoryId:null giữ nguyên giao dịch chưa gán category (notIn tự loại NULL theo ngữ nghĩa SQL).
        safe(prisma.financeTransaction.aggregate({
            where: { status: BALANCE_STATUS, deletedAt: null, OR: [{ categoryId: null }, { categoryId: { notIn: kyQuyCategoryIds } }] },
            _sum: { cashIn: true, bankIn: true },
        }), { _sum: { cashIn: 0, bankIn: 0 } }),
        safe(prisma.financeTransaction.aggregate({
            where: { status: BALANCE_STATUS, deletedAt: null, OR: [{ categoryId: null }, { categoryId: { notIn: kyQuyCategoryIds } }] },
            _sum: { cashOut: true, bankOut: true },
        }), { _sum: { cashOut: 0, bankOut: 0 } }),
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
        safe(prisma.financeTransaction.aggregate({
            where: { status: BALANCE_STATUS, deletedAt: null, date: { gte: new Date(Date.now() - 30 * 86400000) } },
            _sum: { cashOut: true, bankOut: true },
        }), { _sum: { cashOut: 0, bankOut: 0 } }),
        // Finance transactions for cashflow timeline
        safe(prisma.financeTransaction.findMany({
            where: { status: BALANCE_STATUS, deletedAt: null, date: { gte: dateFilter } },
            select: { cashIn: true, cashOut: true, bankIn: true, bankOut: true, date: true },
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
    // Cash Balance/Burn Rate dùng tổng thật (bao gồm ký quỹ) — tiền vẫn thực sự ra/vào quỹ.
    const totalRevenue = (income._sum.cashIn || 0) + (income._sum.bankIn || 0);
    const totalExpense = (expense._sum.cashOut || 0) + (expense._sum.bankOut || 0);
    const cashBalance  = totalRevenue - totalExpense;
    // Doanh thu/Chi phí (P&L) — loại trừ Ký quỹ vì đây là tiền đặt cọc có thể thu hồi, không phải chi phí/doanh thu thực.
    const revenuePL = (incomePL._sum.cashIn || 0) + (incomePL._sum.bankIn || 0);
    const expensePLTotal = (expensePL._sum.cashOut || 0) + (expensePL._sum.bankOut || 0);

    const totalContractValue = contractValueAgg._sum.contractValue || 0;
    const totalPaid          = contractValueAgg._sum.paidAmount || 0;
    const receivable         = Math.max(0, totalContractValue - totalPaid);

    const payable = pendingExpensesRaw.reduce((s, e) => s + e.amount, 0);
    const blocked = pendingExpensesRaw.filter(e => e.status === 'Chờ duyệt');
    const blockedAmount = blocked.reduce((s, e) => s + e.amount, 0);
    const blockedCount  = blocked.length;

    const burnRate30d = ((expense30dAgg._sum.cashOut || 0) + (expense30dAgg._sum.bankOut || 0)) / 30;
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
        dailyMap[d].thu += (tx.cashIn || 0) + (tx.bankIn || 0);
        dailyMap[d].chi += (tx.cashOut || 0) + (tx.bankOut || 0);
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
            revenue: revenuePL,
            expense: expensePLTotal,
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
