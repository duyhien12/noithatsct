import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { workItemLibrarySchema, workItemLibraryBulkSchema, workItemLibraryCategoryRenameSchema } from '@/lib/validations/workItemLibrary';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const category = searchParams.get('category');

    const where = {};
    if (category) where.category = category;

    let data, total;
    try {
        [data, total] = await Promise.all([
            prisma.workItemLibrary.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ category: 'asc' }, { subcategory: 'asc' }, { name: 'asc' }],
            }),
            prisma.workItemLibrary.count({ where }),
        ]);
    } catch {
        return NextResponse.json(paginatedResponse([], 0, { page, limit }));
    }
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();

    // Bulk create support
    if (Array.isArray(body)) {
        const validated = workItemLibraryBulkSchema.parse(body);
        const items = await prisma.workItemLibrary.createMany({ data: validated });
        return NextResponse.json({ count: items.count }, { status: 201 });
    }

    const validated = workItemLibrarySchema.parse(body);
    const item = await prisma.workItemLibrary.create({ data: validated });
    return NextResponse.json(item, { status: 201 });
});

// PATCH: rename category
export const PATCH = withAuth(async (request) => {
    const body = await request.json();
    const { oldCategory, newCategory } = workItemLibraryCategoryRenameSchema.parse(body);
    await prisma.workItemLibrary.updateMany({
        where: { category: oldCategory },
        data: { category: newCategory },
    });
    return NextResponse.json({ ok: true });
});
