import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { designOrderUpdateSchema } from '@/lib/validations/designOrder';
import { calcAll } from '@/lib/designOrderCalc';
import { canEditDraft } from '@/lib/designOrderStatus';

const VIEW_ROLES = ['kinh_doanh', 'thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin', 'viewer'];
const EDIT_ROLES = ['kinh_doanh', 'ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const designOrder = await prisma.designOrder.findUnique({
        where: { id },
        include: {
            customer: { select: { name: true, phone: true, code: true } },
            project: { select: { name: true, address: true, code: true } },
            items: { orderBy: { order: 'asc' } },
        },
    });
    if (!designOrder) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    return NextResponse.json(designOrder);
}, { roles: VIEW_ROLES });

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.designOrder.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (!canEditDraft(session.user.role, existing.status)) {
        return NextResponse.json({ error: 'Phiếu đã gửi đi, không thể sửa ở trạng thái hiện tại' }, { status: 409 });
    }

    const body = await request.json();
    const { items, ...validated } = designOrderUpdateSchema.parse(body);

    const customer = await prisma.customer.findUnique({ where: { id: validated.customerId }, select: { name: true, phone: true } });
    if (!customer) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });

    const { subtotal, totalAfterDiscount, grandTotal } = calcAll(
        items, validated.discount, validated.discountType, validated.vatRate
    );

    const designOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.designOrder.update({
            where: { id },
            data: {
                customerId: validated.customerId,
                projectId: validated.projectId || null,
                customerName: validated.customerName || customer.name,
                customerPhone: validated.customerPhone || customer.phone,
                siteAddress: validated.siteAddress,
                projectType: validated.projectType,
                designArea: validated.designArea,
                designStyle: validated.designStyle,
                requirementLevel: validated.requirementLevel,
                deadline: validated.deadline,
                notes: validated.notes,
                attachments: validated.attachments,
                discount: validated.discount,
                discountType: validated.discountType,
                vatRate: validated.vatRate,
                subtotal,
                totalAfterDiscount,
                grandTotal,
            },
        });

        await tx.designOrderItem.deleteMany({ where: { designOrderId: id } });
        await tx.designOrderItem.createMany({
            data: items.map((it, i) => ({
                designOrderId: id,
                order: i,
                name: it.name,
                unit: it.unit,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                amount: it.quantity * it.unitPrice,
                note: it.note,
            })),
        });

        return updated;
    });

    return NextResponse.json(designOrder);
}, { roles: EDIT_ROLES });

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.designOrder.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (existing.status !== 'Nháp') {
        return NextResponse.json({ error: 'Chỉ có thể xóa phiếu ở trạng thái Nháp — dùng đổi trạng thái "Hủy" cho phiếu đã gửi' }, { status: 409 });
    }

    await prisma.designOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: EDIT_ROLES });
