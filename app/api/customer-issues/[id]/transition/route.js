import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { customerIssueTransitionSchema, parseIssueInput } from '@/lib/validations/customerIssue';
import { assertTransition, transitionFields } from '@/lib/customerIssue/workflow';
import { ISSUE_STATUS_LABELS, LOG_ACTION } from '@/lib/customerIssue/constants';
import { fail, readJson, loadActor, loadIssueFor, writeIssueLog, notifyIssueUsers } from '@/lib/customerIssue/service';

// POST /api/customer-issues/[id]/transition — { toStatus, reason?, resolution? }
// Dùng cho cả nút bấm và kéo thả Kanban. Trả 409 nếu người khác vừa đổi trạng thái.
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'view');
    if (res.response) return res.response;
    const { issue, perms } = res;

    const parsed = parseIssueInput(customerIssueTransitionSchema, await readJson(request));
    if (parsed.error) return NextResponse.json(parsed.error, { status: 400 });
    const { toStatus, reason, resolution } = parsed.data;

    if (resolution !== undefined && resolution !== issue.resolution && !perms.update && !perms.confirm) {
        return fail('Bạn không có quyền sửa kết quả xử lý', 403);
    }
    const error = assertTransition(issue, toStatus, { perms, reason, resolution });
    if (error) return fail(error, /quyền/.test(error) ? 403 : 400);

    const updated = await prisma.$transaction(async (tx) => {
        const { count } = await tx.customerIssue.updateMany({
            where: { id, status: issue.status, deletedAt: null },
            data: {
                ...transitionFields(toStatus, { actor, reason }),
                ...(resolution !== undefined && { resolution }),
            },
        });
        if (count === 0) return null;
        await writeIssueLog(tx, id, actor, {
            action: LOG_ACTION.STATUS_CHANGED,
            fromStatus: issue.status,
            toStatus,
            message: reason,
        });
        const row = await tx.customerIssue.findFirst({ where: { id } });
        const watchers = [issue.assigneeId, issue.createdById, ...issue.collaborators.map(c => c.userId)];
        await notifyIssueUsers(tx, watchers, actor, row, `Chuyển trạng thái: ${ISSUE_STATUS_LABELS[issue.status]} → ${ISSUE_STATUS_LABELS[toStatus]}`);
        return row;
    });
    if (!updated) return fail('Vấn đề vừa được người khác cập nhật — vui lòng tải lại', 409);
    return NextResponse.json(updated);
});
