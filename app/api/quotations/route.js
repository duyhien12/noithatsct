import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { quotationCreateSchema } from '@/lib/validations/quotation';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const where = {};
    if (status) where.status = status;
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [quotations, total] = await Promise.all([
        prisma.quotation.findMany({
            where,
            include: {
                customer: { select: { name: true } },
                project: { select: { name: true } },
                categories: { include: { items: true }, orderBy: { order: 'asc' } },
                items: true,
                _count: { select: { contracts: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.quotation.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(quotations, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { categories, ...validated } = quotationCreateSchema.parse(body);

    const result = await withCodeRetry('quotation', 'BG', async (code) => {
        const data = {
            code,
            customerId: validated.customerId,
            projectId: validated.projectId || null,
            type: validated.type || 'Thi công thô',
            notes: validated.notes || '',
            status: validated.status || 'Nháp',
            vat: Number(validated.vat) || 10,
            discount: Number(validated.discount) || 0,
            managementFeeRate: Number(validated.managementFeeRate) || 5,
            managementFee: Number(validated.managementFee) || 0,
            designFee: Number(validated.designFee) || 0,
            otherFee: Number(validated.otherFee) || 0,
            directCost: Number(validated.directCost) || 0,
            total: Number(validated.total) || 0,
            grandTotal: Number(validated.grandTotal) || 0,
            deductions: validated.deductions || [],
        };

        return prisma.$transaction(async (tx) => {
            const quotation = await tx.quotation.create({ data });

            if (categories && categories.length > 0) {
                for (let ci = 0; ci < categories.length; ci++) {
                    const cat = categories[ci];
                    const createdCat = await tx.quotationCategory.create({
                        data: {
                            name: cat.name || '',
                            group: cat.group || '',
                            image: cat.image || '',
                            order: ci,
                            subtotal: cat.subtotal || 0,
                            quotationId: quotation.id,
                        },
                    });
                    if (cat.items && cat.items.length > 0) {
                        for (let ii = 0; ii < cat.items.length; ii++) {
                            const item = cat.items[ii];
                            const parentItem = await tx.quotationItem.create({
                                data: {
                                    name: item.name || '',
                                    order: ii,
                                    unit: item.unit || '',
                                    quantity: Number(item.quantity) || 0,
                                    volume: Number(item.volume) || 0,
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
                                    categoryId: createdCat.id,
                                    quotationId: quotation.id,
                                },
                            });
                            if (item.subItems && item.subItems.length > 0) {
                                await tx.quotationItem.createMany({
                                    data: item.subItems.map((si, sii) => ({
                                        name: si.name || '',
                                        order: sii,
                                        unit: si.unit || '',
                                        quantity: Number(si.quantity) || 0,
                                        volume: Number(si.volume) || 0,
                                        unitPrice: Number(si.unitPrice) || 0,
                                        amount: Number(si.amount) || 0,
                                        description: si.description || '',
                                        length: Number(si.length) || 0,
                                        width: Number(si.width) || 0,
                                        height: Number(si.height) || 0,
                                        image: si.image || '',
                                        parentItemId: parentItem.id,
                                        quotationId: quotation.id,
                                        categoryId: createdCat.id,
                                    })),
                                });
                            }
                        }
                    }
                }
            }

            return await tx.quotation.findUnique({
                where: { id: quotation.id },
                include: {
                    categories: { include: { items: true }, orderBy: { order: 'asc' } },
                    items: true,
                },
            });
        });
    });

    return NextResponse.json(result, { status: 201 });
});
