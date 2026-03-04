import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { categoryCreateSchema } from '@/lib/validations/productCategory';

// GET: tree of categories with product counts
export const GET = withAuth(async () => {
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
        // Table may not exist yet
        return NextResponse.json([]);
    }
});

// POST: create category
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = categoryCreateSchema.parse(body);
    const cat = await prisma.productCategory.create({ data });
    return NextResponse.json(cat, { status: 201 });
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
