import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { customerIssueAssignSchema, parseIssueInput } from '@/lib/validations/customerIssue';
import { ISSUE_STATUS, LOG_ACTION } from '@/lib/customerIssue/constants';
import { fail, readJson, loadActor, loadIssueFor, writeIssueLog, notifyIssueUsers, findActiveUsers } from '@/lib/customerIssue/service';

// POST /api/customer-issues/[id]/assign — { assigneeId: string | null }
// Người được giao nếu đang là người phối hợp thì được chuyển khỏi danh sách phối hợp.
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'assign');
    if (res.response) return res.response;
    const { issue } = res;

    const parsed = parseIssueInput(customerIssueAssignSchema, await readJson(request));
    if (parsed.error) return NextResponse.json(parsed.error, { status: 400 });
    const { assigneeId } = parsed.data;

    if ([ISSUE_STATUS.DONE, ISSUE_STATUS.CANCELLED].includes(issue.status)) return fail('Vấn đề đã đóng — mở lại trước khi phân công');
    if ((issue.assigneeId || null) === assigneeId) return NextResponse.json(issue);

    let assignee = null;
    if (assigneeId) {
        [assignee] = await findActiveUsers([assigneeId]);
        if (!assignee) return fail('Người phụ trách không tồn tại hoặc đã ngừng hoạt động');
    }

    const updated = await prisma.$transaction(async (tx) => {
        if (assignee) await tx.customerIssueCollaborator.deleteMany({ where: { issueId: id, userId: assignee.id } });
        const row = await tx.customerIssue.update({
            where: { id },
            data: { assigneeId: assignee?.id || null, assigneeName: assignee?.name || '' },
        });
        await writeIssueLog(tx, id, actor, {
            action: LOG_ACTION.ASSIGNED,
            message: assignee ? assignee.name : 'Bỏ phân công',
            meta: { from: issue.assigneeId || null, fromName: issue.assigneeName, to: assignee?.id || null },
        });
        if (assignee) await notifyIssueUsers(tx, [assignee.id], actor, row, `Bạn được giao phụ trách: ${row.title}`);
        return row;
    });
    return NextResponse.json(updated);
});
