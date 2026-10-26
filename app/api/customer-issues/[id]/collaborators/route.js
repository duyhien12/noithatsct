import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { customerIssueCollaboratorSchema, parseIssueInput } from '@/lib/validations/customerIssue';
import { LOG_ACTION } from '@/lib/customerIssue/constants';
import { fail, readJson, loadActor, loadIssueFor, writeIssueLog, notifyIssueUsers, findActiveUsers } from '@/lib/customerIssue/service';

// POST /api/customer-issues/[id]/collaborators — { userId }
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'collaborators');
    if (res.response) return res.response;
    const { issue } = res;

    const parsed = parseIssueInput(customerIssueCollaboratorSchema, await readJson(request));
    if (parsed.error) return NextResponse.json(parsed.error, { status: 400 });
    const { userId } = parsed.data;

    if (issue.assigneeId === userId) return fail('Người này đang là người phụ trách');
    if (issue.collaborators.some(c => c.userId === userId)) return fail('Người này đã là người phối hợp', 409);
    const [user] = await findActiveUsers([userId]);
    if (!user) return fail('Tài khoản không tồn tại hoặc đã ngừng hoạt động');

    const collaborator = await prisma.$transaction(async (tx) => {
        const row = await tx.customerIssueCollaborator.create({
            data: { issueId: id, userId: user.id, userName: user.name, addedById: actor.id },
        });
        await writeIssueLog(tx, id, actor, { action: LOG_ACTION.COLLABORATOR_ADDED, message: user.name, meta: { userId: user.id } });
        await notifyIssueUsers(tx, [user.id], actor, issue, `Bạn được thêm phối hợp xử lý: ${issue.title}`);
        return row;
    });
    return NextResponse.json(collaborator, { status: 201 });
});

// DELETE /api/customer-issues/[id]/collaborators?userId=...
export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'collaborators');
    if (res.response) return res.response;

    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return fail('Thiếu userId');
    const existing = res.issue.collaborators.find(c => c.userId === userId);
    if (!existing) return fail('Người này không phải người phối hợp', 404);

    await prisma.$transaction(async (tx) => {
        await tx.customerIssueCollaborator.delete({ where: { id: existing.id } });
        await writeIssueLog(tx, id, actor, { action: LOG_ACTION.COLLABORATOR_REMOVED, message: existing.userName, meta: { userId } });
    });
    return NextResponse.json({ success: true });
});
