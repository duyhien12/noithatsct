import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission, hasInvPermission } from '@/lib/inventoryV2/permissions';
import {
    docTypeMeta, assertDocumentCanSubmit, assertDocumentCanApprove,
    assertDocumentCanReject, assertDocumentCanCancel,
} from '@/lib/inventoryV2/workflow';
import { writeInvAudit } from '@/lib/inventoryV2/audit';
import { postLedgerEntry, postTransfer, InsufficientStockError } from '@/lib/inventoryV2/costing';
import { activateReservation, deactivateReservation, autoConsumeReservations } from '@/lib/inventoryV2/reservation';

const ACTION_PERM = {
    submit: 'create_document',
    approve: 'approve_document',
    reject: 'approve_document',
    cancel: 'cancel_document',
};

/**
 * Điểm ghi sổ duy nhất khi duyệt phiếu — mọi cập nhật tồn kho/giữ hàng bắt buộc đi qua đây,
 * bên trong 1 prisma.$transaction. Copy đúng mẫu app/api/manufacturing/orders/[id]/actions/route.js
 * (dispatch theo `action`, ghi InvAuditLog cùng transaction với đổi trạng thái).
 */
async function postApprovedDocument(tx, document, session, allowNegative) {
    const meta = docTypeMeta(document.docType);

    if (meta.class === 'LEDGER') {
        for (const line of document.lines) {
            const result = await postLedgerEntry(tx, {
                materialId: line.materialId, warehouseId: document.warehouseId, locationId: line.locationId,
                direction: meta.direction, quantity: line.quantity, unitCost: line.unitPrice,
                documentId: document.id, documentLineId: line.id, session, allowNegative,
                note: meta.label,
            });
            await tx.invDocumentLine.update({ where: { id: line.id }, data: { avgCostAtPosting: result.unitCostAtPosting } });
        }
        if (meta.direction === 'OUT' && (document.projectId || document.mfgOrderId || document.scheduleTaskId)) {
            for (const line of document.lines) {
                await autoConsumeReservations(tx, {
                    materialId: line.materialId, warehouseId: document.warehouseId,
                    projectId: document.projectId, mfgOrderId: document.mfgOrderId, scheduleTaskId: document.scheduleTaskId,
                    quantity: line.quantity, session,
                });
            }
        }
    } else if (meta.class === 'TRANSFER') {
        for (const line of document.lines) {
            const result = await postTransfer(tx, {
                materialId: line.materialId,
                sourceWarehouseId: document.warehouseId, targetWarehouseId: document.targetWarehouseId,
                sourceLocationId: line.locationId, targetLocationId: line.targetLocationId,
                quantity: line.quantity, documentId: document.id,
                sourceLineId: line.id, targetLineId: line.id, session, allowNegative,
            });
            await tx.invDocumentLine.update({ where: { id: line.id }, data: { avgCostAtPosting: result.out.unitCostAtPosting } });
        }
    } else if (meta.class === 'RESERVE') {
        for (const line of document.lines) {
            await activateReservation(tx, {
                materialId: line.materialId, warehouseId: document.warehouseId,
                projectId: document.projectId, mfgOrderId: document.mfgOrderId, scheduleTaskId: document.scheduleTaskId,
                documentId: document.id, quantity: line.quantity, session,
            });
        }
    } else if (meta.class === 'RELEASE') {
        for (const line of document.lines) {
            let remaining = Number(line.quantity);
            const candidates = await tx.invStockReservation.findMany({
                where: {
                    materialId: line.materialId, warehouseId: document.warehouseId, status: 'ACTIVE',
                    OR: [
                        ...(document.projectId ? [{ projectId: document.projectId }] : []),
                        ...(document.mfgOrderId ? [{ mfgOrderId: document.mfgOrderId }] : []),
                        ...(document.scheduleTaskId ? [{ scheduleTaskId: document.scheduleTaskId }] : []),
                    ],
                },
                orderBy: { reservedAt: 'asc' },
            });
            for (const r of candidates) {
                if (remaining <= 0) break;
                if (Number(r.quantity) <= remaining) {
                    await deactivateReservation(tx, { reservationId: r.id, status: 'RELEASED', session, note: `Hủy giữ qua phiếu ${document.code}` });
                    remaining -= Number(r.quantity);
                }
            }
        }
    }
}

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action, note = '' } = body;

    if (!ACTION_PERM[action]) return NextResponse.json({ error: `Hành động không hợp lệ: ${action}` }, { status: 400 });
    const permErr = assertInvPermission(session, ACTION_PERM[action]);
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const document = await prisma.invDocument.findUnique({ where: { id }, include: { lines: true } });
    if (!document) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    let toStatus, extraData = {};

    if (action === 'submit') {
        const err = assertDocumentCanSubmit(document);
        if (err) return NextResponse.json({ error: err.error }, { status: err.status });
        toStatus = 'PENDING_APPROVAL';
        extraData = { submittedById: session.user.id, submittedAt: new Date() };
    } else if (action === 'approve') {
        const err = assertDocumentCanApprove(document);
        if (err) return NextResponse.json({ error: err.error }, { status: err.status });
        toStatus = 'APPROVED';
        extraData = { approvedById: session.user.id, approvedAt: new Date() };
    } else if (action === 'reject') {
        const err = assertDocumentCanReject(document);
        if (err) return NextResponse.json({ error: err.error }, { status: err.status });
        toStatus = 'DRAFT';
    } else if (action === 'cancel') {
        const err = assertDocumentCanCancel(document);
        if (err) return NextResponse.json({ error: err.error }, { status: err.status });
        toStatus = 'CANCELLED';
        extraData = { cancelledById: session.user.id, cancelledAt: new Date(), cancelReason: note || '' };
    }

    const allowNegative = !!body.allowNegative && hasInvPermission(session.user, 'negative_stock_override');

    try {
        const updated = await prisma.$transaction(async (tx) => {
            if (action === 'approve') {
                await postApprovedDocument(tx, document, session, allowNegative);
            }
            const result = await tx.invDocument.update({ where: { id }, data: { status: toStatus, ...extraData } });
            await writeInvAudit(tx, {
                entityType: 'InvDocument', entityId: id, action: action.toUpperCase(),
                fromStatus: document.status, toStatus, session, note,
            });
            return result;
        });
        return NextResponse.json(updated);
    } catch (err) {
        if (err instanceof InsufficientStockError) {
            return NextResponse.json({ error: err.message, detail: err.detail }, { status: 409 });
        }
        throw err;
    }
});
