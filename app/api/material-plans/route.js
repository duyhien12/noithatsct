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
    const { projectId, productId, quantity, unitPrice, type, notes } = body;
    if (!projectId || !productId) return NextResponse.json({ error: 'projectId và productId bắt buộc' }, { status: 400 });
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const plan = await prisma.materialPlan.create({
        data: {
            projectId, productId,
            quantity: qty, unitPrice: price, totalAmount: qty * price,
            type: type || 'Chính',
            status: 'Chưa đặt',
            notes: notes || '',
        },
        include: { product: { select: { name: true, code: true, unit: true } } },
    });
    return NextResponse.json(plan, { status: 201 });
});
