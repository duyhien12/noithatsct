import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { VIEW_ROLES } from '@/lib/payable';

// Công nợ NCC = Số dư đầu kỳ (Supplier.openingPayableBalance, nhập tay) CỘNG "Phát sinh trong kỳ"
// (PayableEntry — bảng ghi nợ MỚI, tách biệt hoàn toàn khỏi PurchaseOrder/dữ liệu Mua sắm cũ, ghi
// qua "+ Ghi nợ mua hàng") TRỪ "Đã trả trong kỳ" (FinanceTransaction objectType='NCC').
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(`${searchParams.get('to')}T23:59:59.999Z`) : null;
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // with_balance | settled
    const search = searchParams.get('search');

    const suppliers = await prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });

    const entryWhere = {};
    if (projectId) entryWhere.projectId = projectId;
    const entries = await prisma.payableEntry.findMany({ where: entryWhere, select: { supplierId: true, amount: true, date: true } });

    const txWhere = { objectType: 'NCC', deletedAt: null, objectId: { not: '' } };
    if (projectId) txWhere.projectId = projectId;
    const txs = await prisma.financeTransaction.findMany({ where: txWhere, select: { objectId: true, objectName: true, type: true, amount: true, date: true } });

    const entriesBySupplier = new Map();
    for (const e of entries) { if (!entriesBySupplier.has(e.supplierId)) entriesBySupplier.set(e.supplierId, []); entriesBySupplier.get(e.supplierId).push(e); }
    const txBySupplier = new Map();
    for (const t of txs) { if (!txBySupplier.has(t.objectId)) txBySupplier.set(t.objectId, []); txBySupplier.get(t.objectId).push(t); }

    const allIds = new Set([...suppliers.map(s => s.id), ...entriesBySupplier.keys(), ...txBySupplier.keys()]);

    let rows = [...allIds].map(id => {
        const supplier = suppliers.find(s => s.id === id);
        const supEntries = entriesBySupplier.get(id) || [];
        const supTxs = txBySupplier.get(id) || [];
        const name = supplier?.name || supTxs[0]?.objectName || '(NCC đã xóa)';
        const opening = supplier?.openingPayableBalance || 0;

        const netPaid = (list) => list.filter(t => t.type === 'Chi').reduce((s, t) => s + t.amount, 0) - list.filter(t => t.type === 'Thu').reduce((s, t) => s + t.amount, 0);

        const beforeEntries = from ? supEntries.filter(e => e.date < from) : [];
        const beforeTxs = from ? supTxs.filter(t => t.date < from) : [];
        const openingBalance = opening + beforeEntries.reduce((s, e) => s + e.amount, 0) - netPaid(beforeTxs);

        const periodEntries = supEntries.filter(e => (!from || e.date >= from) && (!to || e.date <= to));
        const periodTxs = supTxs.filter(t => (!from || t.date >= from) && (!to || t.date <= to));
        const periodPayable = periodEntries.reduce((s, e) => s + e.amount, 0);
        const periodPaid = netPaid(periodTxs);
        const closingBalance = openingBalance + periodPayable - periodPaid;

        const lastTxDate = supTxs.length ? supTxs.reduce((m, t) => (t.date > m ? t.date : m), supTxs[0].date) : null;

        return {
            supplierId: id, supplierName: name,
            openingBalance, periodPayable, periodPaid, closingBalance,
            lastDate: lastTxDate,
            status: closingBalance > 0.01 ? 'with_balance' : 'settled',
        };
    });

    if (search) rows = rows.filter(r => r.supplierName.toLowerCase().includes(search.toLowerCase()));
    if (status === 'with_balance' || status === 'settled') rows = rows.filter(r => r.status === status);
    rows = rows.filter(r => r.openingBalance !== 0 || r.periodPayable !== 0 || r.periodPaid !== 0 || r.closingBalance !== 0);
    rows.sort((a, b) => new Date(b.lastDate || 0) - new Date(a.lastDate || 0));

    const total = rows.length;
    const paged = rows.slice(skip, skip + limit);

    const dashboard = {
        totalPayable: rows.reduce((s, r) => s + r.closingBalance, 0),
        periodPayable: rows.reduce((s, r) => s + r.periodPayable, 0),
        periodPaid: rows.reduce((s, r) => s + r.periodPaid, 0),
        supplierCount: rows.filter(r => r.status === 'with_balance').length,
    };

    const result = paginatedResponse(paged, total, { page, limit });
    result.dashboard = dashboard;
    return NextResponse.json(result);
}, { roles: VIEW_ROLES });
