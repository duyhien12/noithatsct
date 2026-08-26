import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';
import { generateMaterialSku, generateRemnantCode } from '@/lib/inventoryV2/skuGenerator';
import { withDailyCodeRetry } from '@/lib/generateCode';
import { postLedgerEntry } from '@/lib/inventoryV2/costing';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const parentMaterialId = searchParams.get('parentMaterialId') || undefined;

    const data = await prisma.invMaterialRemnant.findMany({
        where: { ...(status ? { status } : {}), ...(warehouseId ? { warehouseId } : {}), ...(parentMaterialId ? { parentMaterialId } : {}) },
        orderBy: { returnedAt: 'desc' },
        include: {
            parentMaterial: { select: { id: true, sku: true, name: true, brand: true, colorCode: true } },
            warehouse: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            sourceProject: { select: { id: true, code: true, name: true } },
        },
    });
    return NextResponse.json({ data });
});

/**
 * Nhập 1 tấm ván thừa vào kho: tạo SKU giả (SL luôn = 1, nhóm "Vật tư thừa còn sử dụng được")
 * gắn với loại ván gốc (parentMaterialId) để tìm kiếm/gợi ý, đồng thời lập + duyệt luôn 1 phiếu
 * IMPORT_REMNANT (số lượng nhỏ, không cần luồng chờ duyệt riêng) để đưa vào đúng sổ kho/giá vốn.
 */
export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'create_document');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const { parentMaterialId, warehouseId, length, width } = body;
    if (!parentMaterialId || !warehouseId || !(Number(length) > 0) || !(Number(width) > 0)) {
        return NextResponse.json({ error: 'Thiếu loại ván gốc, kho, hoặc kích thước còn lại' }, { status: 400 });
    }

    const parentMaterial = await prisma.invMaterial.findUnique({ where: { id: parentMaterialId } });
    if (!parentMaterial) return NextResponse.json({ error: 'Không tìm thấy loại ván gốc' }, { status: 404 });
    const remnantCategory = await prisma.invMaterialCategory.findFirst({ where: { code: 'VTT' } });
    if (!remnantCategory) return NextResponse.json({ error: 'Chưa seed nhóm "Vật tư thừa còn sử dụng được" (VTT)' }, { status: 500 });

    const usableAreaM2 = (Number(length) * Number(width)) / 1_000_000; // length/width nhập theo mm
    const value = Number(body.value) || 0;

    const result = await prisma.$transaction(async (tx) => {
        const remnantCode = await generateRemnantCode(tx);
        const sku = await generateMaterialSku(tx, remnantCategory.id);
        const pseudoMaterial = await tx.invMaterial.create({
            data: {
                sku, name: `Ván thừa — ${parentMaterial.name} (${remnantCode})`,
                categoryId: remnantCategory.id, brand: parentMaterial.brand, colorCode: parentMaterial.colorCode,
                length: Number(length), width: Number(width), thickness: Number(body.thickness) || parentMaterial.thickness,
                purchaseUnitId: parentMaterial.stockUnitId, stockUnitId: parentMaterial.stockUnitId, issueUnitId: parentMaterial.stockUnitId,
                defaultWarehouseId: warehouseId, status: 'Đang sử dụng', createdById: session.user.id,
            },
        });

        const remnant = await tx.invMaterialRemnant.create({
            data: {
                remnantCode, materialId: pseudoMaterial.id, parentMaterialId,
                sourceProjectId: body.sourceProjectId || null, length: Number(length), width: Number(width),
                thickness: Number(body.thickness) || parentMaterial.thickness, usableAreaM2,
                warehouseId, locationId: body.locationId || null, photo: body.photo || '',
                status: 'USABLE', notes: body.notes || '', createdById: session.user.id,
            },
        });

        const doc = await withDailyCodeRetry('invDocument', 'PNK', (code) => tx.invDocument.create({
            data: {
                code, docType: 'IMPORT_REMNANT', direction: 'IN', status: 'APPROVED',
                warehouseId, projectId: body.sourceProjectId || null,
                notes: `Nhập ván thừa ${remnantCode} từ ${parentMaterial.sku}`,
                createdById: session.user.id, approvedById: session.user.id, approvedAt: new Date(), totalAmount: value,
                lines: { create: [{ lineNo: 0, materialId: pseudoMaterial.id, enteredQuantity: 1, enteredUnitId: pseudoMaterial.stockUnitId, ratioToStockUsed: 1, quantity: 1, unitPrice: value, amount: value }] },
            },
        }));

        await postLedgerEntry(tx, {
            materialId: pseudoMaterial.id, warehouseId, direction: 'IN', quantity: 1, unitCost: value,
            documentId: doc.id, session, note: `Nhập ván thừa ${remnantCode}`,
        });

        return remnant;
    });

    return NextResponse.json(result, { status: 201 });
});
