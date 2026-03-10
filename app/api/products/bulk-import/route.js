import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
        return NextResponse.json({ error: 'Không có sản phẩm nào' }, { status: 400 });
    }
    if (products.length > 500) {
        return NextResponse.json({ error: 'Tối đa 500 sản phẩm mỗi lần import' }, { status: 400 });
    }

    // Get current max SP code number
    const result = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
         FROM "Product"
         WHERE code LIKE $2
           AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
        'SP', 'SP%'
    );
    const maxNum = Number(result?.[0]?.max_num ?? 0);

    // Build category name → id lookup
    let catLookup = {};
    try {
        const cats = await prisma.productCategory.findMany({ select: { id: true, name: true } });
        cats.forEach(c => { catLookup[c.name.toLowerCase().trim()] = c.id; });
    } catch { /* table may not exist */ }

    // Prepare bulk data with sequential codes
    const toCreate = products.map((p, i) => ({
        code: `SP${String(maxNum + i + 1).padStart(3, '0')}`,
        name: String(p.name).trim(),
        category: String(p.category || '').trim(),
        unit: String(p.unit || 'cái').trim(),
        salePrice: Number(p.salePrice) || 0,
        importPrice: Number(p.importPrice) || 0,
        stock: Number(p.stock) || 0,
        minStock: Number(p.minStock) || 0,
        brand: String(p.brand || '').trim(),
        supplyType: String(p.supplyType || 'Mua ngoài').trim(),
        supplier: String(p.supplier || '').trim(),
        description: String(p.description || '').trim(),
        color: String(p.color || '').trim(),
        material: String(p.material || '').trim(),
        origin: String(p.origin || '').trim(),
        location: String(p.location || '').trim(),
        status: 'Đang bán',
        categoryId: catLookup[String(p.category || '').toLowerCase().trim()] || null,
    }));

    const created = await prisma.product.createMany({
        data: toCreate,
        skipDuplicates: true,
    });

    return NextResponse.json({ success: true, count: created.count, total: products.length });
});
