import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { designTaskUpdateSchema } from '@/lib/validations/designTask';
import { VIEW_ROLES, MANAGE_ROLES } from '@/lib/designTaskStatus';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const designTask = await prisma.designTask.findUnique({
        where: { id },
        include: { customer: { select: { name: true, phone: true, address: true, code: true } } },
    });
    if (!designTask) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });
    return NextResponse.json(designTask);
}, { roles: VIEW_ROLES });

// Sửa nhanh từng ô trên bảng CV Thiết kế (ngày, trạng thái, ghi chú, người thực hiện...).
export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.designTask.findUnique({ where: { id }, select: { id: true, customerId: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });

    const body = await request.json();
    const validated = designTaskUpdateSchema.parse(body);
    const data = { ...validated };

    if (validated.customerId && validated.customerId !== existing.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: validated.customerId }, select: { name: true } });
        if (!customer) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
        data.customerName = customer.name;
    }

    const designTask = await prisma.designTask.update({ where: { id }, data });
    return NextResponse.json(designTask);
}, { roles: MANAGE_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.designTask.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });

    await prisma.designTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: MANAGE_ROLES });
