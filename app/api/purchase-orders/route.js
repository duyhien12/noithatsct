import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || '';

    const where = {};
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { supplier: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [orders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where,
            include: {
                items: true,
                project: { select: { name: true, code: true, address: true } },
                supplierRel: { select: { id: true, name: true, code: true, phone: true, address: true, taxCode: true, bankAccount: true, bankName: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(orders, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const data = await request.json();
    const { items, requisitionIds, ...poData } = data;
    const code = await generateCode('purchaseOrder', 'PO');

    // Clean items: strip internal fields not in schema
    const cleanItems = (items || []).map(({ _mpId, ...rest }) => ({
        ...rest,
        quantity: Number(rest.quantity) || 0,
        unitPrice: Number(rest.unitPrice) || 0,
        amount: Number(rest.amount) || 0,
        materialPlanId: _mpId || rest.materialPlanId || undefined,
    }));

    const order = await prisma.purchaseOrder.create({
        data: {
            code,
            supplier: poData.supplier,
            totalAmount: Number(poData.totalAmount) || 0,
            status: 'Chờ duyệt',
            deliveryType: poData.deliveryType || 'Giao thẳng dự án',
            deliveryAddress: poData.deliveryAddress || '',
            notes: poData.notes || '',
            projectId: poData.projectId || null,
            supplierId: poData.supplierId || null,
            orderDate: poData.orderDate ? new Date(poData.orderDate) : new Date(),
            deliveryDate: poData.deliveryDate ? new Date(poData.deliveryDate) : null,
            items: cleanItems.length > 0 ? { create: cleanItems } : undefined,
        },
        include: {
            items: true,
            project: { select: { name: true, code: true, address: true } },
            supplierRel: { select: { id: true, name: true, code: true, phone: true, address: true, taxCode: true, bankAccount: true, bankName: true } },
        },
    });

    // Link requisitions to this PO if provided
    if (requisitionIds?.length) {
        await prisma.materialRequisition.updateMany({
            where: { id: { in: requisitionIds } },
            data: { purchaseOrderId: order.id, status: 'Đã lên đơn' },
        });
    }

    return NextResponse.json(order);
});
