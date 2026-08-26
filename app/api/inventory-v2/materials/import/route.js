import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';
import { generateMaterialSku } from '@/lib/inventoryV2/skuGenerator';

/**
 * Import danh mục vật tư từ Excel — client parse .xlsx (XLSX.utils.sheet_to_json) rồi POST
 * mảng JSON `{rows}` tới đây, giống mẫu app/api/finance-transactions/import/route.js.
 * Xử lý từng dòng độc lập, trả về lỗi theo dòng để UI hiển thị báo cáo import từng phần.
 */
export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'manage_material_catalog');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    if (rows.length === 0) return NextResponse.json({ error: 'File không có dòng dữ liệu' }, { status: 400 });

    const [categories, units] = await Promise.all([
        prisma.invMaterialCategory.findMany(),
        prisma.invUnit.findMany(),
    ]);
    const categoryByName = new Map(categories.map(c => [c.name.trim().toLowerCase(), c]));
    const unitByCode = new Map(units.map(u => [u.code.trim().toLowerCase(), u]));

    let success = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNo = i + 2; // dòng 1 là header
        try {
            const name = String(row['Tên vật tư'] || '').trim();
            const categoryName = String(row['Nhóm vật tư'] || '').trim();
            const unitCode = String(row['Đơn vị tồn'] || row['Đơn vị'] || '').trim();
            if (!name) throw new Error('Thiếu tên vật tư');
            const category = categoryByName.get(categoryName.toLowerCase());
            if (!category) throw new Error(`Không tìm thấy nhóm vật tư "${categoryName}"`);
            const unit = unitByCode.get(unitCode.toLowerCase());
            if (!unit) throw new Error(`Không tìm thấy đơn vị "${unitCode}"`);

            await prisma.$transaction(async (tx) => {
                const sku = String(row['Mã SKU'] || '').trim() || await generateMaterialSku(tx, category.id);
                await tx.invMaterial.create({
                    data: {
                        sku, name, categoryId: category.id,
                        brand: String(row['Hãng/NSX'] || '').trim(),
                        colorCode: String(row['Mã màu'] || '').trim(),
                        length: Number(row['Dài'] || 0), width: Number(row['Rộng'] || 0), thickness: Number(row['Dày'] || 0),
                        purchaseUnitId: unit.id, stockUnitId: unit.id, issueUnitId: unit.id,
                        minStock: Number(row['Tồn tối thiểu'] || 0), maxStock: Number(row['Tồn tối đa'] || 0),
                        notes: String(row['Ghi chú'] || ''), createdById: session.user.id,
                    },
                });
            });
            success++;
        } catch (err) {
            errors.push({ row: rowNo, message: err.message });
        }
    }

    return NextResponse.json({ success, total: rows.length, errors });
});
