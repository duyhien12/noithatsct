import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { qualityIssueUpdateSchema } from '@/lib/validations/manufacturing';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';
import { writeAudit } from '@/lib/manufacturing/audit';

// Quy trình xử lý lỗi (mục XI): OPEN -> ASSIGNED -> IN_REPAIR -> WAITING_VERIFICATION -> RESOLVED
// QC phải xác minh lại trước khi lỗi chuyển RESOLVED.
const ALLOWED_TRANSITIONS = {
    OPEN: ['ASSIGNED', 'IN_REPAIR', 'CANCELLED', 'REJECTED'],
    ASSIGNED: ['IN_REPAIR', 'CANCELLED'],
    IN_REPAIR: ['WAITING_VERIFICATION', 'CANCELLED'],
    WAITING_VERIFICATION: ['RESOLVED', 'IN_REPAIR'], // QC xác minh đạt -> RESOLVED, không đạt -> trả về IN_REPAIR
};

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    let data;
    try {
        data = qualityIssueUpdateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const issue = await prisma.qualityIssue.findUnique({ where: { id } });
    if (!issue) return NextResponse.json({ error: 'Không tìm thấy phiếu lỗi' }, { status: 404 });

    const toStatus = data.status;
    if (toStatus && toStatus !== issue.status) {
        const allowed = ALLOWED_TRANSITIONS[issue.status] || [];
        if (!allowed.includes(toStatus)) {
            return NextResponse.json({ error: `Không thể chuyển từ "${issue.status}" sang "${toStatus}"` }, { status: 400 });
        }
        if (toStatus === 'RESOLVED' && !hasMfgPermission(session.user, 'qc') && !hasMfgPermission(session.user, 'resolve_issue')) {
            return NextResponse.json({ error: 'Chỉ QC mới được xác minh và đóng lỗi' }, { status: 403 });
        }
    }

    const now = new Date();
    const extra = {};
    if (toStatus === 'WAITING_VERIFICATION') { extra.resolvedById = session.user.id; extra.resolvedAt = now; }
    if (toStatus === 'RESOLVED') { extra.verifiedById = session.user.id; extra.verifiedAt = now; }

    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.qualityIssue.update({
            where: { id },
            data: {
                ...(toStatus && { status: toStatus }),
                ...(data.correctiveAction !== undefined && { correctiveAction: data.correctiveAction }),
                ...(data.repairCost !== undefined && { repairCost: data.repairCost }),
                ...(data.note !== undefined && { note: data.note }),
                ...extra,
            },
        });

        if (toStatus === 'RESOLVED' && issue.mfgItemId) {
            const stillOpen = await tx.qualityIssue.count({
                where: { mfgItemId: issue.mfgItemId, id: { not: id }, status: { in: ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION'] } },
            });
            if (stillOpen === 0) {
                await tx.mfgItem.update({ where: { id: issue.mfgItemId }, data: { status: 'WAITING_QC' } });
            }
        }

        if (toStatus && toStatus !== issue.status) {
            await writeAudit(tx, { entityType: 'QualityIssue', entityId: id, action: 'STATUS_CHANGE', fromStatus: issue.status, toStatus, session });
        }
        return updated;
    });

    return NextResponse.json(result);
});
