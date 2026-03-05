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
            { product: { name: { contains: search, mode: 'insensitive' } } },
            { product: { code: { contains: search, mode: 'insensitive' } } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
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
            // Get existing plans for dedup
            const existing = await tx.materialPlan.findMany({
                where: { projectId },
                select: { productId: true },
            });
            const existingSet = new Set(existing.map(e => e.productId));

            const newPlans = items
                .filter(i => i.productId && !existingSet.has(i.productId))
                .map(i => ({
                    projectId,
                    productId: i.productId,
                    quantity: Number(i.quantity) || 0,
                    unitPrice: Number(i.unitPrice) || 0,
                    totalAmount: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
                    budgetUnitPrice: Number(i.unitPrice) || 0,
                    type: i.type || 'Chính',
                    category: i.category || '',
                    status: 'Chưa đặt',
                    notes: i.notes || (source ? `Từ ${source}` : ''),
                }));

            if (newPlans.length > 0) {
                await tx.materialPlan.createMany({ data: newPlans });
            }
            return { created: newPlans.length, skipped: items.length - newPlans.length };
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

