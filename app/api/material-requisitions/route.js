import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where = {};
    if (projectId) where.projectId = projectId;

    const reqs = await prisma.materialRequisition.findMany({
        where,
        include: {
            materialPlan: {
                include: { product: { select: { name: true, unit: true, code: true } } },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reqs);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { materialPlanId, projectId, requestedQty, requestedDate, notes, createdBy } = body;

    if (!materialPlanId) return NextResponse.json({ error: 'materialPlanId bắt buộc' }, { status: 400 });
    if (!projectId) return NextResponse.json({ error: 'projectId bắt buộc' }, { status: 400 });
    if (!requestedQty || requestedQty <= 0) return NextResponse.json({ error: 'Số lượng không hợp lệ' }, { status: 400 });

    // Check if requested qty exceeds remaining quota
    const plan = await prisma.materialPlan.findUnique({ where: { id: materialPlanId } });
    if (!plan) return NextResponse.json({ error: 'Kế hoạch vật tư không tồn tại' }, { status: 404 });

    const remaining = plan.quantity - plan.orderedQty;
    const overBudget = requestedQty > remaining;

    const code = await generateCode('materialRequisition', 'YC');
    const req = await prisma.materialRequisition.create({
        data: {
            code,
            materialPlanId,
            projectId,
            requestedQty: Number(requestedQty),
            requestedDate: requestedDate ? new Date(requestedDate) : null,
            notes: notes || '',
            createdBy: createdBy || '',
            status: overBudget ? 'Vượt dự toán - Chờ duyệt' : 'Chờ xử lý',
        },
        include: {
            materialPlan: { include: { product: { select: { name: true, unit: true } } } },
        },
    });

    return NextResponse.json({ ...req, overBudget }, { status: 201 });
});
