import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission, hasInvPermission } from '@/lib/inventoryV2/permissions';
import { findLikelyDuplicates } from '@/lib/inventoryV2/duplicateDetect';
import { generateMaterialSku } from '@/lib/inventoryV2/skuGenerator';

function stripCost(material, canViewCost) {
    if (canViewCost) return material;
    const { avgCost, lastImportPrice, ...rest } = material;
    return rest;
}

export const GET = withAuth(async (request, ctx, session) => {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const categoryId = searchParams.get('categoryId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 500);
    const offset = Number(searchParams.get('offset')) || 0;

    const where = {
        ...(categoryId ? { categoryId } : {}),
        ...(status ? { status } : {}),
        ...(q ? {
            OR: [
                { sku: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
                { colorCode: { contains: q, mode: 'insensitive' } },
                { qrCodeValue: { contains: q, mode: 'insensitive' } },
            ],
        } : {}),
    };

    const [data, total] = await Promise.all([
        prisma.invMaterial.findMany({
            where, take: limit, skip: offset, orderBy: { createdAt: 'desc' },
            include: {
                category: { select: { id: true, name: true, code: true } },
                purchaseUnit: { select: { id: true, code: true } },
                stockUnit: { select: { id: true, code: true } },
                issueUnit: { select: { id: true, code: true } },
                defaultSupplier: { select: { id: true, name: true } },
                defaultWarehouse: { select: { id: true, name: true } },
            },
        }),
        prisma.invMaterial.count({ where }),
    ]);

    const canViewCost = hasInvPermission(session.user, 'view_cost');
    return NextResponse.json({ data: data.map(m => stripCost(m, canViewCost)), total, limit, offset });
});

export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'manage_material_catalog');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const { name, categoryId, purchaseUnitId, stockUnitId, issueUnitId } = body;
    if (!name?.trim() || !categoryId || !purchaseUnitId || !stockUnitId || !issueUnitId) {
        return NextResponse.json({ error: 'Thiếu tên, nhóm vật tư hoặc đơn vị nhập/tồn/xuất' }, { status: 400 });
    }

    const warnings = await findLikelyDuplicates({
        name, categoryId, colorCode: body.colorCode, length: body.length, width: body.width, thickness: body.thickness,
    });

    const material = await prisma.$transaction(async (tx) => {
        const sku = body.sku?.trim() || await generateMaterialSku(tx, categoryId);
        return tx.invMaterial.create({
            data: {
                sku, name: name.trim(), categoryId,
                brand: body.brand || '', colorCode: body.colorCode || '', specNote: body.specNote || '',
                length: Number(body.length) || 0, width: Number(body.width) || 0, thickness: Number(body.thickness) || 0,
                dimensionUnit: body.dimensionUnit || 'mm',
                purchaseUnitId, stockUnitId, issueUnitId,
                purchaseToStockRatio: Number(body.purchaseToStockRatio) || 1,
                issueToStockRatio: Number(body.issueToStockRatio) || 1,
                defaultSupplierId: body.defaultSupplierId || null,
                defaultWarehouseId: body.defaultWarehouseId || null,
                defaultLocationId: body.defaultLocationId || null,
                minStock: Number(body.minStock) || 0, maxStock: Number(body.maxStock) || 0,
                image: body.image || '', notes: body.notes || '',
                createdById: session.user.id,
            },
            include: { category: true, purchaseUnit: true, stockUnit: true, issueUnit: true },
        });
    });

    return NextResponse.json({ ...material, warnings }, { status: 201 });
});
