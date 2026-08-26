import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission, hasInvPermission } from '@/lib/inventoryV2/permissions';
import { findLikelyDuplicates } from '@/lib/inventoryV2/duplicateDetect';

export const GET = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const material = await prisma.invMaterial.findUnique({
        where: { id },
        include: {
            category: true, purchaseUnit: true, stockUnit: true, issueUnit: true,
            defaultSupplier: { select: { id: true, name: true, code: true } },
            defaultWarehouse: true, defaultLocation: true,
            balances: { include: { warehouse: { select: { id: true, name: true } } } },
        },
    });
    if (!material) return NextResponse.json({ error: 'Không tìm thấy vật tư' }, { status: 404 });

    const canViewCost = hasInvPermission(session.user, 'view_cost');
    if (!canViewCost) {
        delete material.avgCost;
        delete material.lastImportPrice;
        material.balances = material.balances.map(({ avgCost, ...b }) => b);
    }
    return NextResponse.json(material);
});

export const PUT = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_material_catalog');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const warnings = body.categoryId
        ? await findLikelyDuplicates({
            id, name: body.name, categoryId: body.categoryId,
            colorCode: body.colorCode, length: body.length, width: body.width, thickness: body.thickness,
        })
        : [];

    const material = await prisma.invMaterial.update({
        where: { id },
        data: {
            name: body.name?.trim(), categoryId: body.categoryId,
            brand: body.brand, colorCode: body.colorCode, specNote: body.specNote,
            length: body.length !== undefined ? Number(body.length) : undefined,
            width: body.width !== undefined ? Number(body.width) : undefined,
            thickness: body.thickness !== undefined ? Number(body.thickness) : undefined,
            purchaseUnitId: body.purchaseUnitId, stockUnitId: body.stockUnitId, issueUnitId: body.issueUnitId,
            purchaseToStockRatio: body.purchaseToStockRatio !== undefined ? Number(body.purchaseToStockRatio) : undefined,
            issueToStockRatio: body.issueToStockRatio !== undefined ? Number(body.issueToStockRatio) : undefined,
            defaultSupplierId: body.defaultSupplierId, defaultWarehouseId: body.defaultWarehouseId, defaultLocationId: body.defaultLocationId,
            minStock: body.minStock !== undefined ? Number(body.minStock) : undefined,
            maxStock: body.maxStock !== undefined ? Number(body.maxStock) : undefined,
            image: body.image, notes: body.notes, status: body.status,
            updatedById: session.user.id,
        },
    });
    return NextResponse.json({ ...material, warnings });
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'manage_material_catalog');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const [balance, reservation] = await Promise.all([
        prisma.invStockBalance.findFirst({ where: { materialId: id, OR: [{ onHandQty: { not: 0 } }, { reservedQty: { not: 0 } }] } }),
        prisma.invStockReservation.findFirst({ where: { materialId: id, status: 'ACTIVE' } }),
    ]);
    if (balance || reservation) {
        return NextResponse.json({ error: 'Vật tư còn tồn kho hoặc đang bị giữ — không thể xóa' }, { status: 409 });
    }
    await prisma.invMaterial.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
