import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: danh sách vật tư xưởng (wrapper Product + usage stats)
export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock') === 'true';
    const supplier = searchParams.get('supplier');

    const where = { deletedAt: null };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (lowStock) where.stock = { lte: 5 };
    if (supplier) where.supplier = { contains: supplier, mode: 'insensitive' };

    const [products, usageStats] = await Promise.all([
        prisma.product.findMany({
            where,
            orderBy: { name: 'asc' },
            select: {
                id: true, code: true, name: true, category: true,
                unit: true, stock: true, minStock: true,
                importPrice: true, salePrice: true, supplier: true,
            },
        }),
        // Tổng số lượng đã dùng trong workshop tasks
        prisma.workshopTaskMaterial.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
        }),
    ]);

    const usageMap = Object.fromEntries(usageStats.map(u => [u.productId, u._sum.quantity || 0]));

    const data = products.map(p => ({
        ...p,
        usedInTasks: usageMap[p.id] || 0,
        inventoryValue: p.stock * p.importPrice,
        isLowStock: p.minStock > 0 && p.stock <= p.minStock,
    }));

    return NextResponse.json(data);
});

// POST: nhập kho thủ công
export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { productId, quantity, type, note } = body; // type: 'in' | 'out'

    if (!productId || !quantity) {
        return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const delta = type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);

    const product = await prisma.product.update({
        where: { id: productId },
        data: { stock: { increment: delta } },
        select: { id: true, name: true, stock: true, unit: true },
    });

    return NextResponse.json(product);
});
