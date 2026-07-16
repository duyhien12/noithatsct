import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';
import {
    assertOrderCanSubmit, assertOrderCanApprove, assertOrderCanStart,
    assertOrderCanCompleteFactory, assertOrderCanComplete, statusAfterApprove,
} from '@/lib/manufacturing/workflow';
import { writeAudit } from '@/lib/manufacturing/audit';
import { notifyMfgOrderApproved } from '@/lib/notify';

// permission key + trạng thái đích cho từng action đơn giản (không cần kiểm tra nghiệp vụ riêng)
const SIMPLE_ACTIONS = {
    submit: { perm: 'update', to: 'WAITING_APPROVAL', check: assertOrderCanSubmit },
    pause: { perm: 'update', to: 'PAUSED' },
    reject: { perm: 'approve', to: 'WAITING_DOCUMENTS' },
};

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action, note = '', resumeTo } = body;

    const order = await prisma.mfgOrder.findFirst({
        where: { id, deletedAt: null },
        include: {
            items: { select: { id: true, status: true } },
            materialReqs: { select: { status: true } },
            qualityIssues: { select: { status: true, severity: true } },
        },
    });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    let toStatus, permKey, auditAction = action?.toUpperCase() || 'ACTION';
    const now = new Date();
    const extraData = {};

    if (action === 'approve') {
        permKey = 'approve';
        const err = assertOrderCanApprove(order);
        if (err) return NextResponse.json({ error: err }, { status: 400 });
        toStatus = statusAfterApprove(order.materialReqs);
        extraData.approvedById = session.user.id;
        extraData.approvedAt = now;
    } else if (action === 'start') {
        permKey = 'start';
        const err = assertOrderCanStart(order);
        if (err) return NextResponse.json({ error: err }, { status: 400 });
        toStatus = 'IN_PRODUCTION';
        if (!order.actualStartDate) extraData.actualStartDate = now;
    } else if (action === 'resume') {
        permKey = 'start';
        if (order.status !== 'PAUSED') return NextResponse.json({ error: 'Lệnh không ở trạng thái tạm dừng' }, { status: 400 });
        toStatus = resumeTo || 'IN_PRODUCTION';
    } else if (action === 'complete_factory') {
        permKey = 'qc';
        const err = assertOrderCanCompleteFactory(order, order.items, order.qualityIssues);
        if (err) return NextResponse.json({ error: err }, { status: 400 });
        toStatus = 'COMPLETED_AT_FACTORY';
    } else if (action === 'complete') {
        permKey = 'complete';
        const err = assertOrderCanComplete(order, order.items, order.qualityIssues);
        if (err) return NextResponse.json({ error: err }, { status: 400 });
        toStatus = 'COMPLETED';
        extraData.actualEndDate = now;
        extraData.progressPercent = 100;
    } else if (action === 'cancel') {
        permKey = 'delete';
        if (!note?.trim()) return NextResponse.json({ error: 'Bắt buộc nhập lý do hủy lệnh' }, { status: 400 });
        toStatus = 'CANCELLED';
        extraData.cancelReason = note.trim();
    } else if (SIMPLE_ACTIONS[action]) {
        const cfg = SIMPLE_ACTIONS[action];
        permKey = cfg.perm;
        if (cfg.check) {
            const err = cfg.check(order);
            if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        toStatus = cfg.to;
    } else {
        return NextResponse.json({ error: `Hành động không hợp lệ: ${action}` }, { status: 400 });
    }

    if (!hasMfgPermission(session.user, permKey)) {
        return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.mfgOrder.update({
            where: { id },
            data: { status: toStatus, note: note ? `${order.note ? order.note + '\n' : ''}[${auditAction}] ${note}`.slice(0, 4000) : undefined, updatedById: session.user.id, ...extraData },
            include: { project: { select: { code: true, name: true } } },
        });
        await writeAudit(tx, {
            entityType: 'MfgOrder', entityId: id, action: auditAction,
            fromStatus: order.status, toStatus, session, note,
        });
        return result;
    });

    if (action === 'approve') {
        notifyMfgOrderApproved(updated).catch(() => {});
    }

    return NextResponse.json(updated);
});
