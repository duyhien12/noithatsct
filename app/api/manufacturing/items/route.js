import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { generateCode } from '@/lib/generateCode';
import { mfgItemCreateSchema } from '@/lib/validations/manufacturing';
import { buildItemCodePrefix } from '@/lib/manufacturing/itemCode';
import { writeAudit } from '@/lib/manufacturing/audit';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const mfgOrderId = searchParams.get('mfgOrderId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const roomName = searchParams.get('roomName');
    const assignedWorkerId = searchParams.get('assignedWorkerId');
    const overdueOnly = searchParams.get('overdueOnly') === 'true';
    const search = searchParams.get('search');

    const where = {};
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (roomName) where.roomName = roomName;
    if (assignedWorkerId) where.assignedWorkerId = assignedWorkerId;
    if (overdueOnly) {
        where.plannedEndDate = { lt: new Date() };
        where.status = { notIn: ['COMPLETED', 'INSTALLED', 'DELIVERED', 'CANCELLED'] };
    }
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [items, total] = await Promise.all([
        prisma.mfgItem.findMany({
            where,
            include: {
                mfgOrder: { select: { id: true, code: true, status: true } },
                assignedWorker: { select: { id: true, name: true } },
                stages: { orderBy: { sequence: 'asc' }, select: { id: true, name: true, status: true, progressPercent: true } },
                _count: { select: { qualityIssues: true } },
            },
            orderBy: [{ createdAt: 'asc' }],
            skip,
            take: limit,
        }),
        prisma.mfgItem.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(items, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    let data;
    try {
        data = mfgItemCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const order = await prisma.mfgOrder.findFirst({ where: { id: data.mfgOrderId, deletedAt: null }, select: { id: true, projectId: true, status: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
        return NextResponse.json({ error: `Lệnh đã "${order.status}" — không thể thêm sản phẩm` }, { status: 409 });
    }
    const project = await prisma.project.findUnique({ where: { id: order.projectId }, select: { code: true } });

    const prefix = buildItemCodePrefix(project.code, data.category, data.name);
    const code = await generateCode('mfgItem', prefix, 2);

    // Chọn danh sách công đoạn áp dụng: theo lựa chọn của người dùng, hoặc mặc định các công đoạn bắt buộc phù hợp category
    let templates = [];
    if (data.stageTemplateIds?.length) {
        templates = await prisma.mfgStageTemplate.findMany({
            where: { id: { in: data.stageTemplateIds }, isActive: true },
            orderBy: { sequence: 'asc' },
        });
    } else {
        templates = await prisma.mfgStageTemplate.findMany({
            where: {
                isActive: true, isRequired: true,
                OR: [{ productCategory: '' }, { productCategory: data.category || '' }],
            },
            orderBy: { sequence: 'asc' },
        });
    }

    const item = await prisma.$transaction(async (tx) => {
        const created = await tx.mfgItem.create({
            data: {
                code,
                mfgOrderId: data.mfgOrderId,
                projectId: order.projectId,
                name: data.name,
                category: data.category || '',
                floorName: data.floorName || '',
                roomName: data.roomName || '',
                quantity: data.quantity,
                unit: data.unit || 'cái',
                length: data.length || 0,
                width: data.width || 0,
                height: data.height || 0,
                materialDescription: data.materialDescription || '',
                colorDescription: data.colorDescription || '',
                hardwareDescription: data.hardwareDescription || '',
                drawingDocumentId: data.drawingDocumentId || null,
                drawingUrl: data.drawingUrl || '',
                referenceImageUrl: data.referenceImageUrl || '',
                plannedStartDate: data.plannedStartDate,
                plannedEndDate: data.plannedEndDate,
                assignedTeamName: data.assignedTeamName || '',
                assignedWorkerId: data.assignedWorkerId || null,
                priority: data.priority || 'NORMAL',
                note: data.note || '',
                status: templates.length ? 'WAITING_DRAWING' : 'NOT_STARTED',
                createdById: session.user.id,
                updatedById: session.user.id,
            },
        });

        if (templates.length) {
            await tx.mfgItemStage.createMany({
                data: templates.map((t, i) => ({
                    mfgItemId: created.id,
                    stageTemplateId: t.id,
                    name: t.name,
                    sequence: (i + 1) * 10,
                    estimatedHours: t.defaultDurationHours,
                    status: i === 0 ? 'READY' : 'NOT_STARTED',
                })),
            });
        }

        await writeAudit(tx, { entityType: 'MfgItem', entityId: created.id, action: 'CREATE', toStatus: created.status, session });
        return created;
    });

    const full = await prisma.mfgItem.findUnique({
        where: { id: item.id },
        include: { stages: { orderBy: { sequence: 'asc' } } },
    });
    return NextResponse.json(full, { status: 201 });
});
