import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { customerIssueNoteSchema, parseIssueInput } from '@/lib/validations/customerIssue';
import { LOG_ACTION } from '@/lib/customerIssue/constants';
import { readJson, loadActor, loadIssueFor, writeIssueLog } from '@/lib/customerIssue/service';

// Nhật ký chỉ đọc + thêm ghi chú. Cố ý KHÔNG có PUT/PATCH/DELETE (không ai sửa/xoá nhật ký).

// GET /api/customer-issues/[id]/logs
export const GET = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'view', {});
    if (res.response) return res.response;

    const data = await prisma.customerIssueLog.findMany({ where: { issueId: id }, orderBy: { createdAt: 'desc' }, take: 500 });
    return NextResponse.json({ data });
});

// POST /api/customer-issues/[id]/logs — { message } thêm ghi chú tay
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'note', {});
    if (res.response) return res.response;

    const parsed = parseIssueInput(customerIssueNoteSchema, await readJson(request));
    if (parsed.error) return NextResponse.json(parsed.error, { status: 400 });

    const log = await prisma.$transaction(tx =>
        writeIssueLog(tx, id, actor, { action: LOG_ACTION.NOTE, message: parsed.data.message })
    );
    return NextResponse.json(log, { status: 201 });
});
