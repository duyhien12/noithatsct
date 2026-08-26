import prisma from '@/lib/prisma';
import { postLedgerEntry } from './costing.js';
import { withMaterialSkuRetry } from './skuGenerator.js';

/**
 * Công cụ di trú dữ liệu kho cũ (Product/Warehouse/InventoryTransaction) sang Kho 2.0.
 * CHỈ ĐỌC dữ liệu cũ — không bao giờ update/delete bảng Product/Warehouse/InventoryTransaction.
 * Mọi ghi dữ liệu đều đi qua InvMigrationMapping + costing.postLedgerEntry, chỉ khi
 * status = CONFIRMED mới được commit.
 */

/** Đọc toàn bộ vật tư kho cũ còn hoạt động, kèm tồn/giá hiện tại — chỉ đọc. */
export async function scanLegacyData() {
    const [products, warehouses] = await Promise.all([
        prisma.product.findMany({
            where: { deletedAt: null },
            select: {
                id: true, code: true, name: true, category: true, unit: true,
                importPrice: true, salePrice: true, stock: true, minStock: true,
                supplier: true, color: true, brand: true, status: true,
            },
            orderBy: { code: 'asc' },
        }),
        prisma.warehouse.findMany({ select: { id: true, code: true, name: true } }),
    ]);
    return { products, warehouses };
}

/**
 * Phát hiện: mã/tên trùng giữa các Product cũ với nhau, và đơn vị (unit string) không
 * khớp bất kỳ InvUnit nào đã seed (đơn vị "sai"/lạ cần người dùng xác nhận quy đổi).
 */
export async function detectDuplicatesAndUnitMismatches(products) {
    const units = await prisma.invUnit.findMany({ select: { code: true } });
    const knownUnits = new Set(units.map(u => u.code.toLowerCase()));

    const byNormName = new Map();
    const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');

    const flags = [];
    for (const p of products) {
        const key = normalize(p.name);
        if (byNormName.has(key)) {
            flags.push({ type: 'DUPLICATE_NAME', productId: p.id, code: p.code, matchCode: byNormName.get(key), message: `Tên trùng với ${byNormName.get(key)}` });
        } else {
            byNormName.set(key, p.code);
        }
        if (p.unit && !knownUnits.has(p.unit.toLowerCase().trim())) {
            flags.push({ type: 'UNKNOWN_UNIT', productId: p.id, code: p.code, unit: p.unit, message: `Đơn vị "${p.unit}" chưa có trong danh mục đơn vị mới — cần chọn đơn vị tương ứng` });
        }
    }
    return flags;
}

/** Bảng đối chiếu tồn/giá trị cũ vs mới cho các mapping đã có targetMaterialId. */
export async function buildReconciliation() {
    const mappings = await prisma.invMigrationMapping.findMany({
        where: { targetMaterialId: { not: null } },
        include: { targetMaterial: { select: { id: true, sku: true, name: true, defaultWarehouseId: true } } },
    });

    const rows = [];
    for (const m of mappings) {
        const legacyProduct = await prisma.product.findUnique({ where: { id: m.legacyProductId }, select: { code: true, name: true, stock: true, importPrice: true } });
        if (!legacyProduct) continue;
        const balances = await prisma.invStockBalance.findMany({ where: { materialId: m.targetMaterialId } });
        const newStock = balances.reduce((s, b) => s + Number(b.onHandQty), 0);
        const newValue = balances.reduce((s, b) => s + Number(b.onHandQty) * Number(b.avgCost), 0);
        const legacyValue = Number(legacyProduct.stock || 0) * Number(legacyProduct.importPrice || 0);
        rows.push({
            mappingId: m.id, legacyCode: legacyProduct.code, legacyName: legacyProduct.name,
            legacyStock: legacyProduct.stock, legacyValue,
            newSku: m.targetMaterial?.sku, newStock, newValue,
            delta: newValue - legacyValue, status: m.status,
        });
    }
    return rows;
}

/**
 * Commit 1 mapping đã CONFIRMED: tạo InvMaterial mới (CREATE_NEW) hoặc dùng targetMaterialId
 * có sẵn (MERGE_INTO_EXISTING), rồi lập + duyệt 1 phiếu IMPORT_OPENING_BALANCE để đưa tồn đầu
 * kỳ vào đúng cơ chế sổ kho/giá vốn — không ghi thẳng vào InvStockBalance.
 */
export async function commitMapping(tx, mapping, session) {
    if (mapping.status !== 'CONFIRMED') {
        throw new Error('Chỉ commit được mapping đã ở trạng thái CONFIRMED');
    }

    const legacyProduct = await prisma.product.findUniqueOrThrow({ where: { id: mapping.legacyProductId } });

    let materialId = mapping.targetMaterialId;
    if (mapping.decision === 'CREATE_NEW') {
        const category = await tx.invMaterialCategory.findFirst({ where: { name: legacyProduct.category } })
            || await tx.invMaterialCategory.findFirst({ where: { code: 'BTP' } });
        const unit = await tx.invUnit.upsert({
            where: { code: legacyProduct.unit || 'cái' },
            create: { code: legacyProduct.unit || 'cái', name: legacyProduct.unit || 'cái' },
            update: {},
        });
        const created = await withMaterialSkuRetry(category.id, (sku) => tx.invMaterial.create({
            data: {
                sku, name: legacyProduct.name, categoryId: category.id,
                brand: legacyProduct.brand || '', colorCode: legacyProduct.color || '',
                purchaseUnitId: unit.id, stockUnitId: unit.id, issueUnitId: unit.id,
                lastImportPrice: legacyProduct.importPrice || 0,
                legacyProductId: legacyProduct.id,
                createdById: session?.user?.id || '',
                status: legacyProduct.status === 'Ngừng bán' ? 'Ngừng sử dụng' : 'Đang sử dụng',
            },
        }));
        materialId = created.id;
    }

    let warehouseId = mapping.targetWarehouseId;
    if (!warehouseId) {
        const defaultWh = await tx.invWarehouse.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!defaultWh) throw new Error('Chưa có kho nào trong Kho 2.0 — hãy tạo kho trước khi di trú');
        warehouseId = defaultWh.id;
    }

    const qty = Number(legacyProduct.stock || 0);
    if (qty <= 0) {
        await tx.invMigrationMapping.update({ where: { id: mapping.id }, data: { status: 'COMMITTED', reconciledOpeningQty: 0, reconciledOpeningValue: 0 } });
        return { materialId, warehouseId, quantity: 0 };
    }

    const unitCost = Number(legacyProduct.importPrice || 0);
    const doc = await tx.invDocument.create({
        data: {
            code: `PDK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${legacyProduct.code}`,
            docType: 'IMPORT_OPENING_BALANCE', direction: 'IN', status: 'APPROVED',
            warehouseId, notes: `Di trú tồn đầu kỳ từ kho cũ — mã cũ ${legacyProduct.code}`,
            createdById: session?.user?.id || '', approvedById: session?.user?.id || '', approvedAt: new Date(),
            totalAmount: qty * unitCost,
        },
    });
    const material = await tx.invMaterial.findUniqueOrThrow({ where: { id: materialId } });
    await tx.invDocumentLine.create({
        data: {
            documentId: doc.id, materialId, enteredQuantity: qty, enteredUnitId: material.stockUnitId,
            ratioToStockUsed: 1, quantity: qty, unitPrice: unitCost, amount: qty * unitCost,
        },
    });

    await postLedgerEntry(tx, {
        materialId, warehouseId, direction: 'IN', quantity: qty, unitCost,
        documentId: doc.id, session, note: 'Tồn đầu kỳ di trú từ kho cũ',
    });

    await tx.invMigrationMapping.update({
        where: { id: mapping.id },
        data: { status: 'COMMITTED', targetMaterialId: materialId, targetWarehouseId: warehouseId, reconciledOpeningQty: qty, reconciledOpeningValue: qty * unitCost },
    });

    return { materialId, warehouseId, quantity: qty, documentId: doc.id };
}
