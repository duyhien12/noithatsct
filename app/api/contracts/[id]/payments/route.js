import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

async function syncCustomerRevenue(contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: { customerId: true } });
    if (!contract?.customerId) return;
    const result = await prisma.contract.aggregate({ where: { customerId: contract.customerId }, _sum: { paidAmount: true } });
    await prisma.customer.update({ where: { id: contract.customerId }, data: { totalRevenue: result._sum.paidAmount || 0 } });
}

// Thêm 1 đợt thanh toán mới vào lịch thanh toán của hợp đồng (sổ kế hoạch, chưa có tiền thật).
// paidAmount LUÔN bắt đầu từ 0 — số tiền đã thu chỉ được ghi qua PUT .../payments/[paymentId]
// (createCollectionTransaction, xem lib/receivable.js), không nhận từ đây nữa.
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const data = await request.json();
    const payment = await prisma.contractPayment.create({
        data: {
            contractId: id,
            phase: data.phase || '',
            amount: Number(data.amount) || 0,
            category: data.category || '',
            status: 'Chưa thu',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            notes: data.notes || '',
        },
    });
    return NextResponse.json(payment, { status: 201 });
});

// Sửa lịch thanh toán (thêm/sửa/xóa đợt) — KHÔNG xóa-tạo-lại toàn bộ như trước (sẽ làm mất liên
// kết PaymentAllocation của các đợt đã có tiền thu). Thay vào đó: item có "id" → update (chỉ các
// field lịch: phase/amount/category/dueDate/notes, KHÔNG nhận paidAmount); item không có "id" →
// tạo mới (paidAmount=0); đợt cũ bị bỏ khỏi danh sách → chỉ xóa nếu chưa phát sinh thu tiền nào.
export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { phases } = await request.json();

    const existing = await prisma.contractPayment.findMany({ where: { contractId: id } });
    const existingById = new Map(existing.map(p => [p.id, p]));
    const keepIds = new Set((phases || []).filter(p => p.id).map(p => p.id));

    const toDelete = existing.filter(p => !keepIds.has(p.id));
    const blocked = toDelete.filter(p => p.paidAmount > 0.01);
    if (blocked.length > 0) {
        return NextResponse.json({ error: `Không thể xóa đợt "${blocked[0].phase}" vì đã có phát sinh thu tiền — hãy giữ lại đợt này trong danh sách.` }, { status: 400 });
    }

    for (const p of (phases || [])) {
        if (p.id && existingById.has(p.id)) {
            const cur = existingById.get(p.id);
            const newAmount = Number(p.amount) || 0;
            if (newAmount < cur.paidAmount - 0.01) {
                return NextResponse.json({ error: `Giá trị đợt "${p.phase}" (${newAmount.toLocaleString('vi-VN')}) không được nhỏ hơn số đã thu (${cur.paidAmount.toLocaleString('vi-VN')})` }, { status: 400 });
            }
            await prisma.contractPayment.update({
                where: { id: p.id },
                data: { phase: p.phase || '', amount: newAmount, category: p.category || '', dueDate: p.dueDate ? new Date(p.dueDate) : null, notes: p.notes || '' },
            });
        } else {
            await prisma.contractPayment.create({
                data: { contractId: id, phase: p.phase || '', amount: Number(p.amount) || 0, category: p.category || '', status: 'Chưa thu', dueDate: p.dueDate ? new Date(p.dueDate) : null, notes: p.notes || '' },
            });
        }
    }
    if (toDelete.length > 0) {
        await prisma.contractPayment.deleteMany({ where: { id: { in: toDelete.map(p => p.id) } } });
    }

    const [payments, total] = await Promise.all([
        prisma.contractPayment.findMany({ where: { contractId: id }, orderBy: { createdAt: 'asc' } }),
        prisma.contractPayment.aggregate({ where: { contractId: id }, _sum: { paidAmount: true } }),
    ]);
    await prisma.contract.update({ where: { id }, data: { paidAmount: total._sum.paidAmount || 0 } });
    await syncCustomerRevenue(id);
    return NextResponse.json(payments);
});
