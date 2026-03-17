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
        where.OR = [
            { product: { name: { contains: search } } },
            { product: { code: { contains: search } } },
            { project: { name: { contains: search } } },
        ];
    }

    const [plans, total] = await Promise.all([
        prisma.materialPlan.findMany({
            where,
            include: {
                product: { select: { name: true, code: true, unit: true } },
                project: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.materialPlan.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(plans, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();

    // Bulk mode: { projectId, items: [{ productId, quantity, unitPrice, type, notes, category }] }
    if (body.items && Array.isArray(body.items)) {
        const { projectId, items, source } = body;
        if (!projectId) return NextResponse.json({ error: 'projectId bắt buộc' }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {
            const pt = items[0]?.planType || 'tracking';
            const existingRaw = await tx.materialPlan.findMany({ where: { projectId, planType: pt }, select: { productId: true } });
            const existingSet = new Set(existingRaw.map(e => e.productId).filter(Boolean));

            const validItems = items.filter(i =>
                (i.productId && !existingSet.has(i.productId)) ||
                (!i.productId && (i.customName || '').trim())
            );

            // Items WITH productId — use normal Prisma createMany
            const withProduct = validItems.filter(i => i.productId);
            if (withProduct.length > 0) {
                await tx.materialPlan.createMany({
                    data: withProduct.map(i => ({
                        projectId,
                        productId: i.productId,
                        quantity: Number(i.quantity) || 0,
                        unitPrice: Number(i.unitPrice) || 0,
                        totalAmount: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
                        budgetUnitPrice: Number(i.unitPrice) || 0,
                        actualCost: Number(i.actualCost) || 0,
                        type: i.type || 'Chính',
                        category: i.category || '',
                        costType: i.costType || 'Vật tư',
                        group1: i.group1 || '',
                        group2: i.group2 || '',
                        supplierTag: i.supplierTag || '',
                        status: 'Chưa đặt',
                        planType: pt,
                        notes: i.notes || (source ? `Từ ${source}` : ''),
                    })),
                });
            }

            // Items WITHOUT productId — use raw SQL to bypass stale Prisma client requiring productId
            const withoutProduct = validItems.filter(i => !i.productId);
            for (const i of withoutProduct) {
                const customName = (i.customName || '').trim();
                const qty = Number(i.quantity) || 0;
                const price = Number(i.unitPrice) || 0;
                const costType = i.costType || 'Vật tư';
                const group1 = i.group1 || '';
                const group2 = i.group2 || '';
                const supplierTag = i.supplierTag || '';
                const notes = source ? `Từ ${source}` : '';
                await tx.$executeRaw`
                    INSERT INTO "MaterialPlan" (id, "projectId", quantity, "unitPrice", "totalAmount", "budgetUnitPrice", "actualCost", type, category, "costType", group1, group2, "supplierTag", status, notes, "planType", "wastePercent", "isLocked", "orderedQty", "receivedQty", "drawingUrl", "drawingNote", "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), ${projectId}, ${qty}, ${price}, ${qty * price}, ${price}, ${Number(i.actualCost) || 0}, 'Chính', ${customName}, ${costType}, ${group1}, ${group2}, ${supplierTag}, 'Chưa đặt', ${notes}, ${pt}, 5, false, 0, 0, '', '', NOW(), NOW())
                `;
            }

            return { created: validItems.length, skipped: items.length - validItems.length };
        });

        return NextResponse.json(result, { status: 201 });
    }

    // Single mode (existing)
    const { projectId, productId, quantity, unitPrice, type, notes } = body;
    if (!projectId || !productId) return NextResponse.json({ error: 'projectId và productId bắt buộc' }, { status: 400 });
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const plan = await prisma.materialPlan.create({
        data: {
            projectId, productId,
            quantity: qty, unitPrice: price, totalAmount: qty * price,
            budgetUnitPrice: price,
            type: type || 'Chính',
            status: 'Chưa đặt',
            notes: notes || '',
        },
        include: { product: { select: { name: true, code: true, unit: true } } },
    });
    return NextResponse.json(plan, { status: 201 });
});

