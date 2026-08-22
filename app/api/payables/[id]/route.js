import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { VIEW_ROLES, CREATE_ROLES } from '@/lib/payable';

// Sổ chi tiết 1 NCC — gộp "Phát sinh" (PayableEntry — mua chịu, ghi qua "+ Ghi nợ mua hàng") +
// "Đã trả" (FinanceTransaction objectType='NCC') theo dòng thời gian, cộng số dư đầu kỳ nhập tay.
export const GET = withAuth(async (request, { params }) => {
    const { id: supplierId } = await params;

    const [supplier, entries, txs] = await Promise.all([
        prisma.supplier.findUnique({ where: { id: supplierId } }),
        prisma.payableEntry.findMany({ where: { supplierId }, include: { project: { select: { id: true, name: true, code: true } } }, orderBy: { date: 'asc' } }),
        prisma.financeTransaction.findMany({
            where: { objectType: 'NCC', objectId: supplierId, deletedAt: null },
            include: { project: { select: { id: true, name: true, code: true } } },
            orderBy: { date: 'asc' },
        }),
    ]);
    if (!supplier && entries.length === 0 && txs.length === 0) return NextResponse.json({ error: 'Không có dữ liệu' }, { status: 404 });

    const opening = supplier?.openingPayableBalance || 0;

    const events = [
        ...entries.map(e => ({
            date: e.date, code: e.code, kind: 'invoice', entryId: e.id, content: e.content || `Mua nợ ${e.code}`,
            project: e.project, payableAmount: e.amount, paidAmount: 0, attachments: e.attachments || [],
        })),
        ...txs.map(t => ({
            date: t.date, code: t.code, kind: 'payment', content: t.content,
            project: t.project, payableAmount: 0, paidAmount: t.type === 'Chi' ? t.amount : -t.amount,
            financeTransactionId: t.id, financeTransactionCode: t.code, attachments: t.attachments || [],
        })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = opening;
    const ledger = events.map(e => { running += e.payableAmount - e.paidAmount; return { ...e, debtBalance: running }; });

    const periodPayable = entries.reduce((s, e) => s + e.amount, 0);
    const periodPaid = txs.filter(t => t.type === 'Chi').reduce((s, t) => s + t.amount, 0) - txs.filter(t => t.type === 'Thu').reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
        supplier: { id: supplierId, name: supplier?.name || txs[0]?.objectName || '', openingBalance: opening },
        summary: { openingBalance: opening, periodPayable, periodPaid, closingBalance: opening + periodPayable - periodPaid },
        ledger,
    });
}, { roles: VIEW_ROLES });

// Sửa số dư đầu kỳ — tương tự BankAccount/CashFund.openingBalance đã có sẵn trong Nhật ký.
export const PATCH = withAuth(async (request, { params }) => {
    const { id: supplierId } = await params;
    const body = await request.json();
    const openingBalance = Number(body.openingBalance);
    if (!Number.isFinite(openingBalance)) return NextResponse.json({ error: 'Số dư đầu kỳ không hợp lệ' }, { status: 400 });

    const updated = await prisma.supplier.update({ where: { id: supplierId }, data: { openingPayableBalance: openingBalance } });
    return NextResponse.json({ id: updated.id, openingBalance: updated.openingPayableBalance });
}, { roles: CREATE_ROLES });
