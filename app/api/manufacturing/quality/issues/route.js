import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { qualityIssueCreateSchema } from '@/lib/validations/manufacturing';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';
import { writeAudit } from '@/lib/manufacturing/audit';
import { notifyMfgIssueAssigned } from '@/lib/notify';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const mfgOrderId = searchParams.get('mfgOrderId');
    const mfgItemId = searchParams.get('mfgItemId');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const openOnly = searchParams.get('openOnly') === 'true';
    const overdueOnly = searchParams.get('overdueOnly') === 'true';

    const where = {};
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;
    if (mfgItemId) where.mfgItemId = mfgItemId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (openOnly) where.status = { in: ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION'] };
    if (overdueOnly) { where.dueDate = { lt: new Date() }; where.status = { in: ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION'] }; }

    const [issues, total] = await Promise.all([
        prisma.qualityIssue.findMany({
            where,
            include: {
                mfgOrder: { select: { id: true, code: true, project: { select: { code: true, name: true } } } },
                item: { select: { id: true, code: true, name: true } },
                responsibleWorker: { select: { id: true, name: true } },
            },
            orderBy: [{ severity: 'desc' }, { reportedAt: 'desc' }],
            skip, take: limit,
        }),
        prisma.qualityIssue.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(issues, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    if (!hasMfgPermission(session.user, 'qc') && !hasMfgPermission(session.user, 'resolve_issue') && !hasMfgPermission(session.user, 'start')) {
        return NextResponse.json({ error: 'Bạn không có quyền báo lỗi' }, { status: 403 });
    }
    let data;
    try {
        data = qualityIssueCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }
    const order = await prisma.mfgOrder.findFirst({ where: { id: data.mfgOrderId, deletedAt: null }, select: { id: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const issue = await withCodeRetry('qualityIssue', `ERR-${yymm}-`, (code) => prisma.$transaction(async (tx) => {
        const created = await tx.qualityIssue.create({
            data: {
                code,
                mfgOrderId: data.mfgOrderId,
                mfgItemId: data.mfgItemId || null,
                mfgItemStageId: data.mfgItemStageId || null,
                qualityInspectionId: data.qualityInspectionId || null,
                title: data.title,
                description: data.description,
                severity: data.severity,
                causeType: data.causeType || '',
                responsibleTeamName: data.responsibleTeamName || '',
                responsibleWorkerId: data.responsibleWorkerId || null,
                reportedById: session.user.id,
                dueDate: data.dueDate,
                status: data.responsibleWorkerId || data.responsibleTeamName ? 'ASSIGNED' : 'OPEN',
            },
        });

        if (data.photos?.length) {
            await tx.mfgAttachment.createMany({
                data: data.photos.map(url => ({
                    entityType: 'QualityIssue', entityId: created.id, url, photoStage: 'before',
                    uploadedById: session.user.id, uploadedByName: session.user.name || '',
                })),
            });
        }

        if (data.mfgItemId) {
            await tx.mfgItem.update({ where: { id: data.mfgItemId }, data: { status: 'REWORK' } });
        }

        await writeAudit(tx, { entityType: 'QualityIssue', entityId: created.id, action: 'CREATE', toStatus: created.status, session });
        return created;
    }), 4);

    if (issue.responsibleWorkerId) {
        const worker = await prisma.workshopWorker.findUnique({ where: { id: issue.responsibleWorkerId }, select: { name: true } });
        if (worker) notifyMfgIssueAssigned({ ...issue, responsibleWorker: worker }).catch(() => {});
    }

    return NextResponse.json(issue, { status: 201 });
});
