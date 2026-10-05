import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calcAll } from '@/lib/designOrderCalc';
import { MANAGE_ALL_ROLES, splitRevenue } from '@/lib/designOrderStatus';

const PRICING_ROLES = ['kinh_doanh', 'thiet_ke', ...MANAGE_ALL_ROLES];

// Nhập đơn giá cho các hạng mục đã có trên phiếu (trang Doanh số thiết kế).
// Chỉ đổi đơn giá — tên/ĐVT/KL giữ nguyên. Phiếu đã hoàn thành thì tính lại doanh số đã chốt.
// PATCH { items: [{ id, unitPrice }] }
export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const prices = new Map(
        (Array.isArray(body.items) ? body.items : []).map(it => [it.id, Math.max(0, Number(it.unitPrice) || 0)])
    );

    const existing = await prisma.designOrder.findUnique({
        where: { id },
        include: { items: { orderBy: { order: 'asc' } }, designers: { orderBy: { userName: 'asc' } } },
    });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (existing.status === 'Hủy') return NextResponse.json({ error: 'Phiếu đã hủy' }, { status: 409 });

    const items = existing.items.map(it => ({
        ...it,
        unitPrice: it.quantity > 0 && prices.has(it.id) ? prices.get(it.id) : it.unitPrice,
    }));
    const { subtotal, totalAfterDiscount, grandTotal } = calcAll(
        items, existing.discount, existing.discountType, existing.vatRate
    );
    const completed = existing.status === 'Hoàn thành';

    const designOrder = await prisma.$transaction(async (tx) => {
        for (const it of items) {
            await tx.designOrderItem.update({
                where: { id: it.id },
                data: { unitPrice: it.unitPrice, amount: it.quantity * it.unitPrice },
            });
        }
        if (completed) {
            for (const d of splitRevenue(totalAfterDiscount, existing.designers)) {
                await tx.designOrderDesigner.update({ where: { id: d.id }, data: { amount: d.amount } });
            }
        }
        await tx.designOrderLog.create({
            data: {
                designOrderId: id,
                fromStatus: existing.status,
                toStatus: existing.status,
                action: 'Cập nhật đơn giá tính doanh số',
                note: `Doanh số trước VAT: ${Math.round(existing.totalAfterDiscount).toLocaleString('vi-VN')} → ${Math.round(totalAfterDiscount).toLocaleString('vi-VN')}`,
                userName: session.user.name,
            },
        });
        return tx.designOrder.update({
            where: { id },
            data: { subtotal, totalAfterDiscount, grandTotal, ...(completed ? { revenueAmount: totalAfterDiscount } : {}) },
        });
    });

    return NextResponse.json(designOrder);
}, { roles: PRICING_ROLES });
