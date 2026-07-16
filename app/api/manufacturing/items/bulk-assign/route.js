import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { writeAudit } from '@/lib/manufacturing/audit';

// Trạng thái được phép đổi hàng loạt — không cho bypass các cổng nghiệp vụ (QC/đóng gói/giao/hoàn thành) qua thao tác hàng loạt
const BULK_ALLOWED_STATUSES = ['NOT_STARTED', 'WAITING_DRAWING', 'WAITING_MATERIAL', 'READY', 'IN_PROGRESS', 'PAUSED'];

export const POST = withAuth(async (request, ctx, session) => {
    const body = await request.json().catch(() => ({}));
    const { itemIds, assignedWorkerId, assignedTeamName, status } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json({ error: 'Chưa chọn sản phẩm nào' }, { status: 400 });
    }
    if (status !== undefined && !BULK_ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json({ error: `Không thể đổi hàng loạt sang trạng thái "${status}" — dùng thao tác chuyên biệt (QC/đóng gói/giao hàng...)` }, { status: 400 });
    }

    const data = { updatedById: session.user.id };
    if (assignedWorkerId !== undefined) data.assignedWorkerId = assignedWorkerId || null;
    if (assignedTeamName !== undefined) data.assignedTeamName = assignedTeamName;
    if (status !== undefined) data.status = status;

    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.mfgItem.updateMany({ where: { id: { in: itemIds } }, data });
        await Promise.all(itemIds.map(id => writeAudit(tx, {
            entityType: 'MfgItem', entityId: id, action: 'BULK_UPDATE', toStatus: status || '', session,
            note: assignedWorkerId !== undefined || assignedTeamName !== undefined ? 'Giao việc hàng loạt' : '',
        })));
        return updated;
    });

    return NextResponse.json({ ok: true, count: result.count });
});
