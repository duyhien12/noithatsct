import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { productCreateSchema } from '@/lib/validations/product';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const category = searchParams.get('category');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const cursor = searchParams.get('cursor'); // for infinite scroll
    const brand = searchParams.get('brand');
    const status = searchParams.get('status');
    const supplyType = searchParams.get('supplyType');
    const stockFilter = searchParams.get('stockFilter'); // low, out

    const where = {};
    if (category) where.category = category;
    if (categoryId) {
        try {
            const descendants = await getDescendantIds(categoryId);
            where.categoryId = { in: [categoryId, ...descendants] };
        } catch {
            // ProductCategory table may not exist yet
            where.categoryId = categoryId;
        }
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (brand) where.brand = brand;
    if (status) where.status = status;
    if (supplyType) where.supplyType = supplyType;
    if (stockFilter === 'out') where.stock = 0;

    // Cursor-based pagination for infinite scroll
    if (cursor) {
        let products;
        try {
            products = await prisma.product.findMany({
                where, take: limit, skip: 1, cursor: { id: cursor },
                orderBy: { createdAt: 'desc' },
                include: { categoryRef: { select: { id: true, name: true } } },
            });
        } catch {
            // categoryRef may not exist if DB not migrated
            products = await prisma.product.findMany({
                where, take: limit, skip: 1, cursor: { id: cursor },
                orderBy: { createdAt: 'desc' },
            });
        }
        return NextResponse.json({
            data: products,
            nextCursor: products.length === limit ? products[products.length - 1].id : null,
        });
    }

    let data, total;
    try {
        [data, total] = await Promise.all([
            prisma.product.findMany({
                where, skip, take: limit,
                orderBy: { createdAt: 'desc' },
                include: { categoryRef: { select: { id: true, name: true } } },
            }),
            prisma.product.count({ where }),
        ]);
    } catch {
        // categoryRef may not exist if DB not migrated
        [data, total] = await Promise.all([
            prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
            prisma.product.count({ where }),
        ]);
    }
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

// Helper: get all descendant category IDs recursively
async function getDescendantIds(parentId) {
    const children = await prisma.productCategory.findMany({
        where: { parentId },
        select: { id: true },
    });
    const ids = children.map(c => c.id);
    for (const child of children) {
        const grandchildren = await getDescendantIds(child.id);
        ids.push(...grandchildren);
    }
    return ids;
}

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = productCreateSchema.parse(body);
    const code = await generateCode('product', 'SP');

    // Auto-link categoryId from category string if not provided
    if (!data.categoryId && data.category) {
        const cat = await prisma.productCategory.findFirst({ where: { name: data.category } });
        if (cat) data.categoryId = cat.id;
    }

    const product = await prisma.product.create({
        data: { code, ...data },
    });
    return NextResponse.json(product, { status: 201 });
});

// PATCH: bulk operations
export const PATCH = withAuth(async (request) => {
    const body = await request.json();
    const { action } = body;

    // Legacy: rename category
    if (body.oldCategory && body.newCategory) {
        const result = await prisma.product.updateMany({
            where: { category: body.oldCategory },
            data: { category: body.newCategory.trim() },
        });
        // Also rename ProductCategory if exists
        await prisma.productCategory.updateMany({
            where: { name: body.oldCategory },
            data: { name: body.newCategory.trim() },
        });
        return NextResponse.json({ updated: result.count });
    }

    // Bulk price update
    if (action === 'bulkPrice') {
        const { ids, mode, value } = body; // mode: 'percent' | 'fixed', value: number
        if (!ids?.length || !value) return NextResponse.json({ error: 'ids and value required' }, { status: 400 });

        if (mode === 'percent') {
            // Update sale price by percentage
            const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, salePrice: true } });
            const results = await prisma.$transaction(
                products.map(p => prisma.product.update({
                    where: { id: p.id },
                    data: { salePrice: Math.round(p.salePrice * (1 + value / 100)) },
                }))
            );
            return NextResponse.json({ updated: results.length });
        } else {
            // Set fixed price
            const result = await prisma.product.updateMany({
                where: { id: { in: ids } },
                data: { salePrice: Number(value) },
            });
            return NextResponse.json({ updated: result.count });
        }
    }

    // Bulk status update
    if (action === 'bulkStatus') {
        const { ids, status } = body;
        if (!ids?.length || !status) return NextResponse.json({ error: 'ids and status required' }, { status: 400 });
        const result = await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { status },
        });
        return NextResponse.json({ updated: result.count });
    }

    // Bulk category assign
    if (action === 'bulkCategory') {
        const { ids, categoryId, category } = body;
        if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
        const data = {};
        if (categoryId) data.categoryId = categoryId;
        if (category) data.category = category;
        const result = await prisma.product.updateMany({
            where: { id: { in: ids } },
            data,
        });
        return NextResponse.json({ updated: result.count });
    }

    return NextResponse.json({ error: 'Action not recognized' }, { status: 400 });
});

