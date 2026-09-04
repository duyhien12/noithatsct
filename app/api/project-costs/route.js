import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { VIEW_ROLES } from '@/lib/financeJournal';

// Tổng chi phí công trình — "Tổng đã chi"/"Tổng đã thu" CHỈ lấy từ Nhật ký Thu – Chi
// (FinanceTransaction theo projectId), KHÔNG lấy từ PurchaseOrder/ProjectExpense/ContractorPayment
// (các bảng đó có quy trình duyệt riêng, dữ liệu không đầy đủ/không khớp số tiền đã thực chi/thu
// như trong Thu – Chi). "Dự toán" và "Giá trị HĐ" vẫn lấy từ Project/Contract vì đó là số liệu kế
// hoạch dùng để đối chiếu, không phải "chi tiết chi phí".
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const overBudget = searchParams.get('overBudget') === '1';

    const [projects, txs] = await Promise.all([
        prisma.project.findMany({
            where: { deletedAt: null },
            select: {
                id: true, code: true, name: true, status: true, budget: true, budgetTotal: true, contractValue: true,
                customer: { select: { name: true } },
                contracts: { where: { deletedAt: null }, select: { contractValue: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.financeTransaction.findMany({
            where: { deletedAt: null, projectId: { not: null } },
            select: { projectId: true, type: true, amount: true },
        }),
    ]);

    const byProject = new Map();
    for (const t of txs) {
        if (!byProject.has(t.projectId)) byProject.set(t.projectId, { chi: 0, thu: 0 });
        const bucket = byProject.get(t.projectId);
        if (t.type === 'Chi') bucket.chi += t.amount;
        else if (t.type === 'Thu') bucket.thu += t.amount;
    }

    let rows = projects.map(p => {
        const contractValue = p.contracts.reduce((s, c) => s + (c.contractValue || 0), 0) || p.contractValue || 0;
        const bucket = byProject.get(p.id) || { chi: 0, thu: 0 };
        const budgetTotal = p.budgetTotal || p.budget || 0;
        const usagePercent = budgetTotal > 0 ? Math.round((bucket.chi / budgetTotal) * 1000) / 10 : null;
        const estimatedProfit = contractValue - bucket.chi;

        return {
            projectId: p.id, code: p.code, name: p.name, status: p.status,
            customerName: p.customer?.name || '',
            budgetTotal, contractValue,
            totalChi: bucket.chi, totalThu: bucket.thu,
            usagePercent, estimatedProfit,
            isOverBudget: budgetTotal > 0 && bucket.chi > budgetTotal,
        };
    });

    if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q));
    }
    if (status) rows = rows.filter(r => r.status === status);
    if (overBudget) rows = rows.filter(r => r.isOverBudget);
    rows = rows.filter(r => r.totalChi !== 0 || r.totalThu !== 0 || r.budgetTotal !== 0 || r.contractValue !== 0);

    rows.sort((a, b) => b.totalChi - a.totalChi);

    const total = rows.length;
    const paged = rows.slice(skip, skip + limit);

    const dashboard = {
        totalBudget: rows.reduce((s, r) => s + r.budgetTotal, 0),
        totalChi: rows.reduce((s, r) => s + r.totalChi, 0),
        totalThu: rows.reduce((s, r) => s + r.totalThu, 0),
        overBudgetCount: rows.filter(r => r.isOverBudget).length,
    };

    const result = paginatedResponse(paged, total, { page, limit });
    result.dashboard = dashboard;
    return NextResponse.json(result);
}, { roles: VIEW_ROLES });
