import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { quotationUpdateSchema } from '@/lib/validations/quotation';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
            customer: true,
            project: true,
            categories: {
                include: { items: true },
                orderBy: { order: 'asc' },
            },
            items: true,
        },
    });
    if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(quotation);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { categories, ...validated } = quotationUpdateSchema.parse(body);

    // Sanitize: only take valid Quotation fields, avoid Prisma error
    const ALLOWED = ['customerId', 'projectId', 'type', 'notes', 'status', 'validUntil',
        'vat', 'discount', 'managementFeeRate', 'managementFee', 'designFee', 'otherFee',
        'adjustment', 'adjustmentType', 'adjustmentAmount',
        'directCost', 'total', 'grandTotal'];
    const data = {};
    for (const key of ALLOWED) {
        if (key in validated) data[key] = validated[key];
    }
    // projectId: "" -> null to avoid FK error
    if (!data.projectId) data.projectId = null;

    // Wrap delete+recreate in a transaction
    await prisma.$transaction(async (tx) => {
        // Delete old categories & items if rebuilding
        if (categories !== undefined) {
            await tx.quotationItem.deleteMany({ where: { quotationId: id } });
            await tx.quotationCategory.deleteMany({ where: { quotationId: id } });
        }

        // Update quotation fields
        await tx.quotation.update({ where: { id }, data });

        // Recreate categories + items
        if (categories) {
            for (let ci = 0; ci < categories.length; ci++) {
                const cat = categories[ci];
                const created = await tx.quotationCategory.create({
                    data: {
                        name: cat.name || '',
                        group: cat.group || '',
                        image: cat.image || '',
                        order: ci,
                        subtotal: cat.subtotal || 0,
                        quotationId: id,
                    },
                });
                if (cat.items && cat.items.length > 0) {
                    await tx.quotationItem.createMany({
                        data: cat.items.map((item, ii) => ({
                            name: item.name || '',
                            order: item.order ?? ii,
                            unit: item.unit || '',
                            quantity: Number(item.quantity) || 0,
                            mainMaterial: Number(item.mainMaterial) || 0,
                            auxMaterial: Number(item.auxMaterial) || 0,
                            labor: Number(item.labor) || 0,
                            unitPrice: Number(item.unitPrice) || 0,
                            amount: Number(item.amount) || 0,
                            description: item.description || '',
                            length: Number(item.length) || 0,
                            width: Number(item.width) || 0,
                            height: Number(item.height) || 0,
                            image: item.image || '',
                            productId: item.productId || null,
                            quotationId: id,
                            categoryId: created.id,
                        })),
                    });
                }
            }
        }
    });

    const result = await prisma.quotation.findUnique({
        where: { id },
        include: {
            customer: true,
            project: true,
            categories: { include: { items: true }, orderBy: { order: 'asc' } },
            items: true,
        },
    });

    return NextResponse.json(result);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        await tx.quotationCategory.deleteMany({ where: { quotationId: id } });
        await tx.quotation.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
});
