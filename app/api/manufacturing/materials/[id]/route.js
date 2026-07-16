import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { mfgMaterialReqUpdateSchema } from '@/lib/validations/manufacturing';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';
import { writeAudit } from '@/lib/manufacturing/audit';

const SATISFIED_STATUSES = ['AVAILABLE', 'ISSUED', 'USED', 'CANCELLED'];

export const PUT = withAuth(async (request, { params }, session) => {
    if (!hasMfgPermission(session.user, 'manage_material')) {
        return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 });
    }
    const { id } = await params;
    let data;
    try {
        data = mfgMaterialReqUpdateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const existing = await prisma.mfgMaterialRequirement.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy nhu cầu vật tư' }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.mfgMaterialRequirement.update({
            where: { id },
            data: {
                ...(data.status !== undefined && { status: data.status }),
                ...(data.issuedQuantity !== undefined && { issuedQuantity: data.issuedQuantity }),
                ...(data.usedQuantity !== undefined && { usedQuantity: data.usedQuantity }),
                ...(data.returnedQuantity !== undefined && { returnedQuantity: data.returnedQuantity }),
                ...(data.missingQuantity !== undefined && { missingQuantity: data.missingQuantity }),
                ...(data.actualUnitPrice !== undefined && { actualUnitPrice: data.actualUnitPrice }),
                ...(data.note !== undefined && { note: data.note }),
            },
        });

        if (data.status && data.status !== existing.status) {
            await writeAudit(tx, { entityType: 'MfgMaterialRequirement', entityId: id, action: 'STATUS_CHANGE', fromStatus: existing.status, toStatus: data.status, session });

            // Tự động chuyển lệnh từ WAITING_MATERIALS -> READY khi toàn bộ nhu cầu vật tư đã sẵn sàng
            const order = await tx.mfgOrder.findUnique({ where: { id: existing.mfgOrderId }, select: { id: true, status: true } });
            if (order?.status === 'WAITING_MATERIALS') {
                const allReqs = await tx.mfgMaterialRequirement.findMany({ where: { mfgOrderId: order.id }, select: { status: true } });
                const allSatisfied = allReqs.every(r => SATISFIED_STATUSES.includes(r.status));
                if (allSatisfied) {
                    await tx.mfgOrder.update({ where: { id: order.id }, data: { status: 'READY' } });
                    await writeAudit(tx, { entityType: 'MfgOrder', entityId: order.id, action: 'AUTO_STATUS_CHANGE', fromStatus: 'WAITING_MATERIALS', toStatus: 'READY', session, note: 'Tự động: đã đủ vật tư' });
                }
            }
        }
        return updated;
    });

    return NextResponse.json(result);
});
