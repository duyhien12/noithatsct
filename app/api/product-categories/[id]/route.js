import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { categoryUpdateSchema } from '@/lib/validations/productCategory';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = categoryUpdateSchema.parse(body);
    const cat = await prisma.productCategory.update({ where: { id }, data });
    return NextResponse.json(cat);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const cat = await prisma.productCategory.findUnique({ where: { id } });
    if (!cat) return NextResponse.json({ success: true }); // Already deleted

    await prisma.$transaction([
        // Reparent children
        prisma.productCategory.updateMany({
            where: { parentId: id },
            data: { parentId: cat.parentId },
        }),
        // Unlink products
        prisma.product.updateMany({
            where: { categoryId: id },
            data: { categoryId: cat.parentId },
        }),
        // Delete category (deleteMany avoids P2025 on race condition)
        prisma.productCategory.deleteMany({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
});
