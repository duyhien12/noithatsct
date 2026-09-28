import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission, hasInvPermission } from '@/lib/inventoryV2/permissions';
import {
    assertDocumentCanSubmit, assertDocumentCanApprove,
    assertDocumentCanReject, assertDocumentCanCancel,
} from '@/lib/inventoryV2/workflow';
import { writeInvAudit } from '@/lib/inventoryV2/audit';
import { InsufficientStockError } from '@/lib/inventoryV2/costing';
import { postApprovedDocument } from '@/lib/inventoryV2/posting';

const ACTION_PERM = {
    submit: 'create_document',
    approve: 'approve_document',
    reject: 'approve_document',
    cancel: 'cancel_document',
};

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
