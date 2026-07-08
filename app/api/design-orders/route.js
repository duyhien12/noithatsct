import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withDailyCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { designOrderCreateSchema } from '@/lib/validations/designOrder';
import { calcAll } from '@/lib/designOrderCalc';

const VIEW_ROLES = ['kinh_doanh', 'thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin', 'viewer'];
const CREATE_ROLES = ['kinh_doanh', 'ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const projectType = searchParams.get('projectType');
    const customerId = searchParams.get('customerId');
    const createdBy = searchParams.get('createdBy');
    const designerAssignee = searchParams.get('designerAssignee');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const search = searchParams.get('search');

    const where = {};
    if (status) where.status = status;
    if (projectType) where.projectType = projectType;
    if (customerId) where.customerId = customerId;
    if (createdBy) where.createdBy = createdBy;
    if (designerAssignee) where.designerAssignee = designerAssignee;
    if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt.gte = new Date(fromDate);
        if (toDate) where.createdAt.lte = new Date(`${toDate}T23:59:59.999Z`);
    }
    if (search) {
        where.OR = [
            { code: { contains: search } },
            { customerName: { contains: search } },
            { siteAddress: { contains: search } },
        ];
    }

    const [designOrders, total] = await Promise.all([
        prisma.designOrder.findMany({
            where,
            include: {
                customer: { select: { name: true, phone: true } },
                project: { select: { name: true, address: true } },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.designOrder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(designOrders, total, { page, limit }));
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { items, ...validated } = designOrderCreateSchema.parse(body);

    const { subtotal, totalAfterDiscount, grandTotal } = calcAll(
        items, validated.discount, validated.discountType, validated.vatRate
    );

    const customer = await prisma.customer.findUnique({ where: { id: validated.customerId }, select: { name: true, phone: true } });
    if (!customer) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });

    const result = await withDailyCodeRetry('designOrder', 'PDH-TK', async (code) => {
        return prisma.$transaction(async (tx) => {
            const designOrder = await tx.designOrder.create({
                data: {
                    code,
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
                    status: 'Nháp',
                    createdBy: session.user.name,
                    createdByRole: session.user.role,
                },
            });

            await tx.designOrderItem.createMany({
                data: items.map((it, i) => ({
                    designOrderId: designOrder.id,
                    order: i,
                    name: it.name,
                    unit: it.unit,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    amount: it.quantity * it.unitPrice,
                    note: it.note,
                })),
            });

            return designOrder;
        });
    });

    return NextResponse.json(result, { status: 201 });
}, { roles: CREATE_ROLES });
