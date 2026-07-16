import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { mfgOrderCreateSchema } from '@/lib/validations/manufacturing';
import { isOrderLate } from '@/lib/manufacturing/progress';
import { writeAudit } from '@/lib/manufacturing/audit';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const projectId = searchParams.get('projectId');
    const productionManagerId = searchParams.get('productionManagerId');
    const overdueOnly = searchParams.get('overdueOnly') === 'true';
    const search = searchParams.get('search');

    const where = { deletedAt: null };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (productionManagerId) where.productionManagerId = productionManagerId;
    if (overdueOnly) {
        where.plannedEndDate = { lt: new Date() };
        where.status = { notIn: ['COMPLETED', 'DELIVERED', 'INSTALLING', 'CANCELLED'] };
    }
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
            { project: { code: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [orders, total] = await Promise.all([
        prisma.mfgOrder.findMany({
            where,
            include: {
                project: { select: { id: true, code: true, name: true } },
                _count: { select: { items: true, qualityIssues: true } },
            },
            orderBy: [{ plannedEndDate: 'asc' }, { createdAt: 'desc' }],
            skip,
            take: limit,
        }),
        prisma.mfgOrder.count({ where }),
    ]);

    const enriched = orders.map(o => ({ ...o, isLate: isOrderLate(o) }));
    return NextResponse.json(paginatedResponse(enriched, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    let data;
    try {
        data = mfgOrderCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: data.projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `LSX-${yymm}-`;

    const order = await withCodeRetry('mfgOrder', prefix, (code) => prisma.$transaction(async (tx) => {
        const created = await tx.mfgOrder.create({
            data: {
                code,
                projectId: data.projectId,
                contractId: data.contractId || null,
                title: data.title,
                description: data.description || '',
                batchNumber: data.batchNumber || '',
                priority: data.priority || 'NORMAL',
                plannedStartDate: data.plannedStartDate,
                plannedEndDate: data.plannedEndDate,
                productionManagerId: data.productionManagerId || '',
                qcManagerId: data.qcManagerId || '',
                note: data.note || '',
                createdById: session.user.id,
                updatedById: session.user.id,
            },
            include: { project: { select: { code: true, name: true } } },
        });
        await writeAudit(tx, { entityType: 'MfgOrder', entityId: created.id, action: 'CREATE', toStatus: 'DRAFT', session });
        return created;
    }), 4);

    return NextResponse.json(order, { status: 201 });
});
