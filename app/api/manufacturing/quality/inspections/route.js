import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { qualityInspectionCreateSchema } from '@/lib/validations/manufacturing';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';
import { writeAudit } from '@/lib/manufacturing/audit';
import { notifyMfgQcFailed } from '@/lib/notify';
import { QC_CHECKLIST_FIELDS } from '@/lib/manufacturing/constants';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const mfgOrderId = searchParams.get('mfgOrderId');
    const mfgItemId = searchParams.get('mfgItemId');
    const result = searchParams.get('result');

    const where = {};
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;
    if (mfgItemId) where.mfgItemId = mfgItemId;
    if (result) where.result = result;

    const [inspections, total] = await Promise.all([
        prisma.qualityInspection.findMany({
            where,
            include: {
                mfgOrder: { select: { id: true, code: true, project: { select: { code: true, name: true } } } },
                item: { select: { id: true, code: true, name: true } },
            },
            orderBy: { inspectedAt: 'desc' },
            skip, take: limit,
        }),
        prisma.qualityInspection.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(inspections, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    if (!hasMfgPermission(session.user, 'qc')) {
        return NextResponse.json({ error: 'Bạn không có quyền thực hiện QC' }, { status: 403 });
    }
    let data;
    try {
        data = qualityInspectionCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const order = await prisma.mfgOrder.findFirst({ where: { id: data.mfgOrderId, deletedAt: null }, select: { id: true, productionManagerId: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    const allPassed = QC_CHECKLIST_FIELDS.every(f => data[f.key] !== false);
    const result = allPassed ? 'PASSED' : 'FAILED';

    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const inspection = await withCodeRetry('qualityInspection', `QC-${yymm}-`, (code) => prisma.$transaction(async (tx) => {
        const created = await tx.qualityInspection.create({
            data: {
                code,
                mfgOrderId: data.mfgOrderId,
                mfgItemId: data.mfgItemId || null,
                inspectionType: data.inspectionType || 'IN_PROCESS',
                inspectorId: session.user.id,
                inspectedAt: data.inspectedAt || now,
                result,
                dimensionPassed: data.dimensionPassed, materialPassed: data.materialPassed, colorPassed: data.colorPassed,
                hardwarePassed: data.hardwarePassed, surfacePassed: data.surfacePassed, edgePassed: data.edgePassed,
                structurePassed: data.structurePassed, assemblyPassed: data.assemblyPassed, cleanlinessPassed: data.cleanlinessPassed,
                packingPassed: data.packingPassed,
                overallNote: data.overallNote || '',
                ...(result === 'PASSED' && { approvedById: session.user.id, approvedAt: now }),
            },
        });

        if (data.mfgItemId) {
            const newItemStatus = result === 'PASSED' ? 'PASSED_QC' : 'REWORK';
            await tx.mfgItem.update({ where: { id: data.mfgItemId }, data: { status: newItemStatus } });
        }

        await writeAudit(tx, { entityType: 'QualityInspection', entityId: created.id, action: result === 'PASSED' ? 'QC_PASS' : 'QC_FAIL', session });
        return created;
    }), 4);

    if (result === 'FAILED') {
        const item = data.mfgItemId ? await prisma.mfgItem.findUnique({ where: { id: data.mfgItemId }, select: { code: true } }) : null;
        notifyMfgQcFailed({ ...inspection, item }, order).catch(() => {});
    }

    return NextResponse.json({ ...inspection, requiresIssue: result === 'FAILED' }, { status: 201 });
});
