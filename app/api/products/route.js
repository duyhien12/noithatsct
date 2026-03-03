import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { productCreateSchema } from '@/lib/validations/product';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where = {};
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
        prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.product.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = productCreateSchema.parse(body);

    const product = await withCodeRetry('product', 'SP', (code) =>
        prisma.product.create({ data: { code, ...data } })
    );
    return NextResponse.json(product, { status: 201 });
});

export const PATCH = withAuth(async (request) => {
    const body = await request.json();
    // Delete category: move products to targetCategory or clear category
    if (body.deleteCategory) {
        const result = await prisma.product.updateMany({
            where: { category: body.deleteCategory },
            data: { category: body.targetCategory?.trim() || '' },
        });
        return NextResponse.json({ updated: result.count });
    }
    // Rename category
    const { oldCategory, newCategory } = body;
    if (!oldCategory || !newCategory?.trim()) {
        return NextResponse.json({ error: 'Thiếu tên danh mục' }, { status: 400 });
    }
    const result = await prisma.product.updateMany({
        where: { category: oldCategory },
        data: { category: newCategory.trim() },
    });
    return NextResponse.json({ updated: result.count });
});
