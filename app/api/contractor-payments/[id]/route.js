import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Chỉ ban quản lý và kế toán mới được xem/sửa hồ sơ thanh toán nhà thầu
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt'];
// Chỉ ban giám đốc mới được xoá
const MANAGEMENT_ROLES = ['giam_doc', 'pho_gd', 'ban_gd'];

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const payment = await prisma.contractorPayment.findUnique({
        where: { id },
        include: {
            items: { orderBy: { acceptedAt: 'asc' } },
            contractor: { select: { name: true, type: true, phone: true } },
        },
    });
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(payment);
}, { roles: FINANCE_ROLES });

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { contractAmount, paidAmount, description, dueDate, status } = body;
    const updated = await prisma.contractorPayment.update({
        where: { id },
        data: {
            ...(contractAmount !== undefined && { contractAmount: Number(contractAmount) }),
            ...(paidAmount !== undefined && { paidAmount: Number(paidAmount) }),
            ...(description !== undefined && { description }),
            ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
            ...(status !== undefined && { status }),
        },
    });
    return NextResponse.json(updated);
}, { roles: FINANCE_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.contractorPayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: MANAGEMENT_ROLES });
