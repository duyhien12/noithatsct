import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
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

    const code = await generateCode('quotation', 'BG');

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
    };

    // Wrap in transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
        const quotation = await tx.quotation.create({ data });

        if (categories && categories.length > 0) {
            for (let ci = 0; ci < categories.length; ci++) {
                const cat = categories[ci];
                const createdCat = await tx.quotationCategory.create({
                    data: {
                        name: cat.name || '',
                        group: cat.group || '',
                        order: ci,
                        subtotal: cat.subtotal || 0,
                        quotationId: quotation.id,
                    },
                });
                if (cat.items && cat.items.length > 0) {
                    await tx.quotationItem.createMany({
                        data: cat.items.map((item, ii) => ({
                            name: item.name || '',
                            order: ii,
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
                            categoryId: createdCat.id,
                            quotationId: quotation.id,
                        })),
                    });
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

    return NextResponse.json(result, { status: 201 });
});
