import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { customerIssueUpdateSchema, parseIssueInput } from '@/lib/validations/customerIssue';
import { allowedTargets } from '@/lib/customerIssue/workflow';
import { ISSUE_STATUS, LOG_ACTION } from '@/lib/customerIssue/constants';
import { fail, readJson, loadActor, loadIssueFor, writeIssueLog, ISSUE_DETAIL_INCLUDE } from '@/lib/customerIssue/service';

const CLOSED = [ISSUE_STATUS.DONE, ISSUE_STATUS.CANCELLED];

// GET /api/customer-issues/[id] — chi tiết + quyền của người xem + bước chuyển hợp lệ
export const GET = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'view');
    if (res.response) return res.response;
    return NextResponse.json({
        ...res.issue,
        permissions: res.perms,
        allowedTransitions: allowedTargets(res.issue.status, res.perms),
    });
});

function sameValue(a, b) {
    if (a instanceof Date || b instanceof Date) return (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null);
    return (a ?? null) === (b ?? null);
}

// PATCH /api/customer-issues/[id] — sửa thông tin (không gồm trạng thái/phân công)
export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'update');
    if (res.response) return res.response;
    const { issue } = res;

    const parsed = parseIssueInput(customerIssueUpdateSchema, await readJson(request));
    if (parsed.error) return NextResponse.json(parsed.error, { status: 400 });
    const input = parsed.data;

    if (CLOSED.includes(issue.status)) return fail('Vấn đề đã đóng — mở lại trước khi sửa');

    if (input.projectId) {
        const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { customerId: true } });
        if (!project) return fail('Không tìm thấy dự án');
        if (project.customerId !== issue.customerId) return fail('Dự án không thuộc khách hàng của vấn đề');
    }
    if (input.projectId !== undefined && input.projectId !== issue.projectId && issue.workOrders.length) {
        return fail('Không thể đổi dự án khi vấn đề đã có phiếu công việc');
    }

    const changes = {};
    for (const [key, value] of Object.entries(input)) {
        if (value === undefined) continue;
        if (!sameValue(issue[key], value)) changes[key] = { from: issue[key] ?? null, to: value };
    }
    if (!Object.keys(changes).length) return NextResponse.json(issue);

    const data = Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.to]));
    const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.customerIssue.update({ where: { id }, data });
        await writeIssueLog(tx, id, actor, {
            action: LOG_ACTION.UPDATED,
            message: Object.keys(changes).join(', '),
            meta: { changes },
        });
        return row;
    });
    return NextResponse.json(updated);
});

// DELETE /api/customer-issues/[id] — xoá mềm (nhật ký được giữ nguyên)
export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'delete');
    if (res.response) return res.response;

    await prisma.$transaction(async (tx) => {
        await writeIssueLog(tx, id, actor, { action: LOG_ACTION.DELETED, fromStatus: res.issue.status });
        await tx.customerIssue.update({ where: { id }, data: { deletedAt: new Date() } });
    });
    return NextResponse.json({ success: true });
});
