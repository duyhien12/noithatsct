import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const type = searchParams.get('type');
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');
    const search = searchParams.get('search') || '';

    const where = {};
    if (type) where.type = type;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (search) {
        where.OR = [
            { code: { contains: search } },
            { product: { name: { contains: search } } },
        ];
    }

    const [transactions, total, warehouses] = await Promise.all([
        prisma.inventoryTransaction.findMany({
            where,
            include: {
                product: { select: { name: true, unit: true } },
                warehouse: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),
        prisma.inventoryTransaction.count({ where }),
        prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({
        ...paginatedResponse(transactions, total, { page, limit }),
        warehouses,
    });
});

export const POST = withAuth(async (request) => {
    const data = await request.json();
    if (!data.productId) return NextResponse.json({ error: 'Sản phẩm bắt buộc' }, { status: 400 });
    if (!data.warehouseId) return NextResponse.json({ error: 'Kho bắt buộc' }, { status: 400 });
    const prefix = data.type === 'Nhập' ? 'PNK' : 'PXK';
    const code = await generateCode('inventoryTransaction', prefix);
    const qty = Number(data.quantity) || 0;

    const tx = await prisma.inventoryTransaction.create({
        data: {
            code,
            type: data.type || 'Nhập',
            quantity: qty,
            unit: data.unit || '',
            note: data.note || '',
            date: data.date ? new Date(data.date) : new Date(),
            productId: data.productId,
            warehouseId: data.warehouseId,
            projectId: data.projectId || null,
        },
    });

    // Update product stock (and importPrice if provided on Nhập)
    const delta = data.type === 'Nhập' ? qty : -qty;
    const productUpdate = { stock: { increment: delta } };
    const importPrice = Number(data.importPrice);
    if (data.type === 'Nhập' && importPrice > 0) productUpdate.importPrice = importPrice;
    await prisma.product.update({ where: { id: data.productId }, data: productUpdate });

    return NextResponse.json(tx, { status: 201 });
});
