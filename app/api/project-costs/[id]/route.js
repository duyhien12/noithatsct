import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { VIEW_ROLES } from '@/lib/financeJournal';

// Chi tiết chi phí công trình — toàn bộ breakdown lấy từ chính các giao dịch Nhật ký Thu – Chi
// của dự án (không join PurchaseOrder/ProjectExpense/ContractorPayment).
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
        select: {
            id: true, code: true, name: true, status: true, budget: true, budgetTotal: true, contractValue: true,
            customer: { select: { name: true } },
            contracts: { where: { deletedAt: null }, select: { contractValue: true } },
        },
    });
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const transactions = await prisma.financeTransaction.findMany({
        where: { projectId: id, deletedAt: null },
        orderBy: { date: 'desc' },
        select: {
            id: true, code: true, date: true, type: true, method: true, amount: true,
            department: true, objectType: true, objectName: true, content: true, status: true,
        },
    });

    const contractValue = project.contracts.reduce((s, c) => s + (c.contractValue || 0), 0) || project.contractValue || 0;
    const budgetTotal = project.budgetTotal || project.budget || 0;
    const totalChi = transactions.filter(t => t.type === 'Chi').reduce((s, t) => s + t.amount, 0);
    const totalThu = transactions.filter(t => t.type === 'Thu').reduce((s, t) => s + t.amount, 0);
    const estimatedProfit = contractValue - totalChi;

    const byDepartment = {};
    const byObjectType = {};
    for (const t of transactions) {
        if (t.type !== 'Chi') continue;
        const dKey = t.department || 'Chưa phân loại';
        if (!byDepartment[dKey]) byDepartment[dKey] = { department: dKey, total: 0, count: 0 };
        byDepartment[dKey].total += t.amount;
        byDepartment[dKey].count += 1;

        const oKey = t.objectType || 'Khác';
        if (!byObjectType[oKey]) byObjectType[oKey] = { objectType: oKey, total: 0, count: 0 };
        byObjectType[oKey].total += t.amount;
        byObjectType[oKey].count += 1;
    }

    return NextResponse.json({
        project: { id: project.id, code: project.code, name: project.name, status: project.status, customerName: project.customer?.name || '' },
        summary: { budgetTotal, contractValue, totalChi, totalThu, estimatedProfit },
        byDepartment: Object.values(byDepartment).sort((a, b) => b.total - a.total),
        byObjectType: Object.values(byObjectType).sort((a, b) => b.total - a.total),
        transactions,
    });
}, { roles: VIEW_ROLES });
