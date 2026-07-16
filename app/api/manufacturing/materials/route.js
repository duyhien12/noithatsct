import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { mfgMaterialReqCreateSchema } from '@/lib/validations/manufacturing';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const mfgOrderId = searchParams.get('mfgOrderId');
    const status = searchParams.get('status');

    const where = {};
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;
    if (status) where.status = status;

    const [reqs, total] = await Promise.all([
        prisma.mfgMaterialRequirement.findMany({
            where,
            include: {
                mfgOrder: { select: { id: true, code: true, project: { select: { code: true, name: true } } } },
                item: { select: { id: true, code: true, name: true } },
                product: { select: { id: true, code: true, name: true, unit: true, stock: true } },
            },
            orderBy: { createdAt: 'asc' },
            skip, take: limit,
        }),
        prisma.mfgMaterialRequirement.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(reqs, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    if (!hasMfgPermission(session.user, 'manage_material') && !hasMfgPermission(session.user, 'create')) {
        return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 });
    }
    let data;
    try {
        data = mfgMaterialReqCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }
    const order = await prisma.mfgOrder.findFirst({ where: { id: data.mfgOrderId, deletedAt: null }, select: { id: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    let materialName = data.materialName, unit = data.unit;
    if (data.productId) {
        const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { name: true, unit: true } });
        if (product) { materialName = materialName || product.name; unit = unit || product.unit; }
    }

    const created = await prisma.mfgMaterialRequirement.create({
        data: {
            mfgOrderId: data.mfgOrderId,
            mfgItemId: data.mfgItemId || null,
            productId: data.productId || null,
            materialName: materialName || '',
            specification: data.specification || '',
            unit: unit || '',
            estimatedQuantity: data.estimatedQuantity || 0,
            estimatedUnitPrice: data.estimatedUnitPrice || 0,
            status: 'REQUESTED',
            requiredDate: data.requiredDate,
            note: data.note || '',
        },
        include: { product: { select: { name: true, unit: true, stock: true } } },
    });
    return NextResponse.json(created, { status: 201 });
});
