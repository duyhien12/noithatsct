import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { customerIssueAttachmentSchema, parseIssueInput } from '@/lib/validations/customerIssue';
import { ATTACHMENT_CATEGORIES, ATTACHMENT_CATEGORY_LABELS, LOG_ACTION } from '@/lib/customerIssue/constants';
import { validateAttachmentInput } from '@/lib/customerIssue/files';
import { fail, readJson, loadActor, loadIssueFor, writeIssueLog } from '@/lib/customerIssue/service';

// Tệp được upload trước qua /api/upload (type = ISSUE_UPLOAD_TYPE), sau đó đăng ký vào vấn đề tại đây.

// GET /api/customer-issues/[id]/attachments?category=BEFORE
export const GET = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'view', {});
    if (res.response) return res.response;

    const category = new URL(request.url).searchParams.get('category');
    const where = { issueId: id, deletedAt: null };
    if (category && ATTACHMENT_CATEGORIES.includes(category)) where.category = category;
    const data = await prisma.customerIssueAttachment.findMany({ where, orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ data });
});

// POST /api/customer-issues/[id]/attachments — { category, url, thumbnailUrl?, fileName?, mimeType?, caption? }
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'files', {});
    if (res.response) return res.response;

    const parsed = parseIssueInput(customerIssueAttachmentSchema, await readJson(request));
    if (parsed.error) return NextResponse.json(parsed.error, { status: 400 });
    const input = parsed.data;
    const fileError = validateAttachmentInput(input);
    if (fileError) return fail(fileError);

    const attachment = await prisma.$transaction(async (tx) => {
        const row = await tx.customerIssueAttachment.create({
            data: { ...input, issueId: id, uploadedById: actor.id, uploadedByName: actor.name },
        });
        await writeIssueLog(tx, id, actor, {
            action: LOG_ACTION.FILE_ADDED,
            message: `${ATTACHMENT_CATEGORY_LABELS[input.category]}: ${input.fileName || input.url}`,
            meta: { attachmentId: row.id, category: input.category },
        });
        return row;
    });
    return NextResponse.json(attachment, { status: 201 });
});
