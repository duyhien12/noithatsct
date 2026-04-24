import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || '';

    const where = {};
    if (search) {
        where.name = { contains: search };
    }

    const [templates, total] = await Promise.all([
        prisma.quotationTemplate.findMany({
            where,
            include: { categories: { include: { items: true }, orderBy: { order: 'asc' } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.quotationTemplate.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(templates, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const { categories, ...data } = await request.json();

    const template = await prisma.quotationTemplate.create({
        data: {
            ...data,
            categories: categories ? {
                create: categories.map((cat, ci) => ({
                    name: cat.name,
                    order: ci,
                    items: {
                        create: (cat.items || []).map((item, ii) => ({
                            name: item.name,
                            order: ii,
                            unit: item.unit || '',
                            quantity: item.quantity || 0,
                            mainMaterial: item.mainMaterial || 0,
                            auxMaterial: item.auxMaterial || 0,
                            labor: item.labor || 0,
                            unitPrice: item.unitPrice || 0,
                            description: item.description || '',
                            length: item.length || 0,
                            width: item.width || 0,
                            height: item.height || 0,
                            volume: item.volume || 0,
                        })),
                    },
                })),
            } : undefined,
        },
        include: { categories: { include: { items: true }, orderBy: { order: 'asc' } } },
    });
    return NextResponse.json(template, { status: 201 });
});
