import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { VIEW_ROLES } from '@/lib/receivable';

// Công nợ Khách hàng = Số dư đầu kỳ (Customer.openingReceivableBalance, nhập tay) CỘNG "Phát sinh
// trong kỳ" (ReceivableEntry — bảng ghi nợ MỚI, tách biệt hoàn toàn khỏi ContractPayment/dữ liệu
// Hợp đồng cũ, ghi qua "+ Ghi nợ bán hàng") TRỪ "Đã thu trong kỳ" (FinanceTransaction
// objectType='Khách hàng').
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(`${searchParams.get('to')}T23:59:59.999Z`) : null;
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // with_balance | settled
    const search = searchParams.get('search');

    const customers = await prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });

    const entryWhere = {};
    if (projectId) entryWhere.contract = { projectId };
    const entries = await prisma.receivableEntry.findMany({ where: entryWhere, select: { customerId: true, amount: true, date: true } });

    const txWhere = { objectType: 'Khách hàng', deletedAt: null, objectId: { not: '' } };
    if (projectId) txWhere.projectId = projectId;
    const txs = await prisma.financeTransaction.findMany({ where: txWhere, select: { objectId: true, objectName: true, type: true, amount: true, date: true } });

    const entriesByCustomer = new Map();
    for (const e of entries) { if (!entriesByCustomer.has(e.customerId)) entriesByCustomer.set(e.customerId, []); entriesByCustomer.get(e.customerId).push(e); }
    const txByCustomer = new Map();
    for (const t of txs) { if (!txByCustomer.has(t.objectId)) txByCustomer.set(t.objectId, []); txByCustomer.get(t.objectId).push(t); }

    const allIds = new Set([...customers.map(c => c.id), ...entriesByCustomer.keys(), ...txByCustomer.keys()]);

    let rows = [...allIds].map(id => {
        const customer = customers.find(c => c.id === id);
        const custEntries = entriesByCustomer.get(id) || [];
        const custTxs = txByCustomer.get(id) || [];
        const name = customer?.name || custTxs[0]?.objectName || '(Khách hàng đã xóa)';
        const opening = customer?.openingReceivableBalance || 0;

        const netPaid = (list) => list.filter(t => t.type === 'Thu').reduce((s, t) => s + t.amount, 0) - list.filter(t => t.type === 'Chi').reduce((s, t) => s + t.amount, 0);

        const beforeEntries = from ? custEntries.filter(e => e.date < from) : [];
        const beforeTxs = from ? custTxs.filter(t => t.date < from) : [];
        const openingBalance = opening + beforeEntries.reduce((s, e) => s + e.amount, 0) - netPaid(beforeTxs);

        const periodEntries = custEntries.filter(e => (!from || e.date >= from) && (!to || e.date <= to));
        const periodTxs = custTxs.filter(t => (!from || t.date >= from) && (!to || t.date <= to));
        const periodPayable = periodEntries.reduce((s, e) => s + e.amount, 0);
        const periodPaid = netPaid(periodTxs);
        const closingBalance = openingBalance + periodPayable - periodPaid;

        const lastTxDate = custTxs.length ? custTxs.reduce((m, t) => (t.date > m ? t.date : m), custTxs[0].date) : null;

        return {
            customerId: id, customerName: name,
            openingBalance, periodPayable, periodPaid, closingBalance,
            lastDate: lastTxDate,
            status: closingBalance > 0.01 ? 'with_balance' : 'settled',
        };
    });

    if (search) rows = rows.filter(r => r.customerName.toLowerCase().includes(search.toLowerCase()));
    if (status === 'with_balance' || status === 'settled') rows = rows.filter(r => r.status === status);
    rows = rows.filter(r => r.openingBalance !== 0 || r.periodPayable !== 0 || r.periodPaid !== 0 || r.closingBalance !== 0);
    rows.sort((a, b) => new Date(b.lastDate || 0) - new Date(a.lastDate || 0));

    const total = rows.length;
    const paged = rows.slice(skip, skip + limit);

    const dashboard = {
        totalReceivable: rows.reduce((s, r) => s + r.closingBalance, 0),
        periodPayable: rows.reduce((s, r) => s + r.periodPayable, 0),
        periodPaid: rows.reduce((s, r) => s + r.periodPaid, 0),
        customerCount: rows.filter(r => r.status === 'with_balance').length,
    };

    const result = paginatedResponse(paged, total, { page, limit });
    result.dashboard = dashboard;
    return NextResponse.json(result);
}, { roles: VIEW_ROLES });
