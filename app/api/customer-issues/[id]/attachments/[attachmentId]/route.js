import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getIssuePermissions } from '@/lib/customerIssue/permissions';
import { ATTACHMENT_CATEGORY_LABELS, LOG_ACTION } from '@/lib/customerIssue/constants';
import { fail, loadActor, loadIssueFor, writeIssueLog } from '@/lib/customerIssue/service';

// DELETE /api/customer-issues/[id]/attachments/[attachmentId] — gỡ tệp (xoá mềm, giữ file gốc để đối chiếu)
// Người upload tự gỡ được tệp của mình; tệp của người khác cần quyền sửa vấn đề theo phòng ban.
export const DELETE = withAuth(async (request, { params }, session) => {
    const { id, attachmentId } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'files', {});
    if (res.response) return res.response;

    const attachment = await prisma.customerIssueAttachment.findFirst({ where: { id: attachmentId, issueId: id, deletedAt: null } });
    if (!attachment) return fail('Không tìm thấy tệp', 404);
    if (attachment.uploadedById !== actor.id && !getIssuePermissions(actor).update) {
        return fail('Chỉ người tải lên hoặc người có quyền sửa mới được gỡ tệp này', 403);
    }

    await prisma.$transaction(async (tx) => {
        await tx.customerIssueAttachment.update({ where: { id: attachmentId }, data: { deletedAt: new Date() } });
        await writeIssueLog(tx, id, actor, {
            action: LOG_ACTION.FILE_REMOVED,
            message: `${ATTACHMENT_CATEGORY_LABELS[attachment.category]}: ${attachment.fileName || attachment.url}`,
            meta: { attachmentId },
        });
    });
    return NextResponse.json({ success: true });
});
