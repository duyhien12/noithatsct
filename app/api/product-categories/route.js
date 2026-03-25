import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { categoryCreateSchema } from '@/lib/validations/productCategory';

// GET: tree of categories with product counts
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const supplier = searchParams.get('supplier');
    const productWhere = supplier ? { supplier: { contains: supplier } } : undefined;
    const countSelect = productWhere
        ? { products: { where: productWhere } }
        : { products: true };

    // Try with supplier filter first, fall back to no filter
    const supplierFilter = supplier ? { where: { supplier } } : {};
    const catWhere = supplier ? { parentId: null, supplier } : { parentId: null };

    try {
        const categories = await prisma.productCategory.findMany({
            include: {
                _count: { select: countSelect },
                children: {
                    ...supplierFilter,
                    include: {
                        _count: { select: countSelect },
                        children: {
                            ...supplierFilter,
                            include: { _count: { select: countSelect } },
                            orderBy: { order: 'asc' },
                        },
                    },
                    orderBy: { order: 'asc' },
                },
            },
            where: catWhere,
            orderBy: { order: 'asc' },
        });
        return NextResponse.json(categories);
    } catch {
        // Fallback: no supplier filter (field may not exist in client yet)
        try {
            const categories = await prisma.productCategory.findMany({
                include: {
                    _count: { select: { products: true } },
                    children: {
                        include: {
                            _count: { select: { products: true } },
                            children: {
                                include: { _count: { select: { products: true } } },
                                orderBy: { order: 'asc' },
                            },
                        },
                        orderBy: { order: 'asc' },
                    },
                },
                where: { parentId: null },
                orderBy: { order: 'asc' },
            });
            return NextResponse.json(categories);
        } catch {
            return NextResponse.json([]);
        }
    }
});

// POST: create category
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = categoryCreateSchema.parse(body);
    try {
        const cat = await prisma.productCategory.create({ data });
        return NextResponse.json(cat, { status: 201 });
    } catch {
        // Fallback: create without supplier field if client doesn't support it yet
        const { supplier: _s, ...dataWithoutSupplier } = data;
        const cat = await prisma.productCategory.create({ data: dataWithoutSupplier });
        return NextResponse.json(cat, { status: 201 });
    }
});

// PATCH: reorder categories (bulk)
export const PATCH = withAuth(async (request) => {
    const body = await request.json();
    const { updates } = body; // [{id, order, parentId?}]
    if (!Array.isArray(updates)) {
        return NextResponse.json({ error: 'updates array required' }, { status: 400 });
    }
    const results = await prisma.$transaction(
        updates.map(u => prisma.productCategory.update({
            where: { id: u.id },
            data: { order: u.order ?? undefined, parentId: u.parentId !== undefined ? u.parentId : undefined },
        }))
    );
    return NextResponse.json(results);
});
