import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withCodeRetry } from '@/lib/generateCode';
import { notifyWorkOrderAssigned } from '@/lib/notify';
import { customerIssueWorkOrderSchema, parseIssueInput } from '@/lib/validations/customerIssue';
import { transitionFields } from '@/lib/customerIssue/workflow';
import {
    ISSUE_STATUS, ISSUE_STATUS_LABELS, LOG_ACTION, WORK_ORDER_DEFAULT_STATUS, WORK_ORDER_PRIORITY_BY_ISSUE,
} from '@/lib/customerIssue/constants';
import { fail, readJson, loadActor, loadIssueFor, writeIssueLog } from '@/lib/customerIssue/service';

const WO_SELECT = { id: true, code: true, title: true, status: true, priority: true, assignee: true, dueDate: true, completedAt: true, projectId: true };

// GET /api/customer-issues/[id]/work-orders — phiếu công việc đã liên kết
export const GET = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'view', {});
    if (res.response) return res.response;

    const data = await prisma.workOrder.findMany({ where: { customerIssueId: id }, select: WO_SELECT, orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ data });
});

// POST /api/customer-issues/[id]/work-orders
//   { mode: 'create', title, description?, assignee?, dueDate?, category? } — tạo phiếu mới trong bảng WorkOrder
//   { mode: 'link', workOrderId } — liên kết phiếu có sẵn cùng dự án
// Vấn đề đang NEW sẽ chuyển sang IN_PROGRESS.
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const actor = await loadActor(session);
    const res = await loadIssueFor(id, actor, 'work_order', {});
    if (res.response) return res.response;
    const { issue } = res;

    const parsed = parseIssueInput(customerIssueWorkOrderSchema, await readJson(request));
    if (parsed.error) return NextResponse.json(parsed.error, { status: 400 });
    const input = parsed.data;

    if (!issue.projectId) return fail('Vấn đề chưa gắn dự án — cần gắn dự án trước khi tạo phiếu công việc');
    if ([ISSUE_STATUS.DONE, ISSUE_STATUS.CANCELLED].includes(issue.status)) return fail('Vấn đề đã đóng');

    if (input.mode === 'link') {
        const wo = await prisma.workOrder.findUnique({ where: { id: input.workOrderId }, select: { ...WO_SELECT, customerIssueId: true } });
        if (!wo) return fail('Không tìm thấy phiếu công việc', 404);
        if (wo.projectId !== issue.projectId) return fail('Phiếu công việc không thuộc dự án của vấn đề');
        if (wo.customerIssueId === id) return fail('Phiếu đã được liên kết với vấn đề này', 409);
        if (wo.customerIssueId) return fail('Phiếu đã được liên kết với vấn đề khác', 409);
    }

    const startProgress = async (tx) => {
        if (issue.status !== ISSUE_STATUS.NEW) return;
        await tx.customerIssue.update({ where: { id }, data: transitionFields(ISSUE_STATUS.IN_PROGRESS, { actor }) });
        await writeIssueLog(tx, id, actor, {
            action: LOG_ACTION.STATUS_CHANGED,
            fromStatus: issue.status,
            toStatus: ISSUE_STATUS.IN_PROGRESS,
            message: `Tự động: đã có phiếu công việc → ${ISSUE_STATUS_LABELS.IN_PROGRESS}`,
        });
    };

    if (input.mode === 'link') {
        const linked = await prisma.$transaction(async (tx) => {
            const { count } = await tx.workOrder.updateMany({
                where: { id: input.workOrderId, customerIssueId: null },
                data: { customerIssueId: id },
            });
            if (count === 0) return null;
            const wo = await tx.workOrder.findFirst({ where: { id: input.workOrderId }, select: WO_SELECT });
            await writeIssueLog(tx, id, actor, { action: LOG_ACTION.WORK_ORDER_LINKED, message: `${wo.code} — ${wo.title}`, meta: { workOrderId: wo.id } });
            await startProgress(tx);
            return wo;
        });
        if (!linked) return fail('Phiếu vừa được liên kết với vấn đề khác', 409);
        return NextResponse.json(linked);
    }

    const order = await withCodeRetry('workOrder', 'WO', (code) =>
        prisma.$transaction(async (tx) => {
            const wo = await tx.workOrder.create({
                data: {
                    code,
                    title: input.title,
                    description: input.description || issue.description,
                    priority: WORK_ORDER_PRIORITY_BY_ISSUE[issue.priority],
                    status: WORK_ORDER_DEFAULT_STATUS,
                    assignee: input.assignee,
                    dueDate: input.dueDate || issue.dueDate,
                    category: input.category,
                    projectId: issue.projectId,
                    customerIssueId: id,
                },
                include: { project: { select: { name: true, code: true } } },
            });
            await writeIssueLog(tx, id, actor, { action: LOG_ACTION.WORK_ORDER_CREATED, message: `${wo.code} — ${wo.title}`, meta: { workOrderId: wo.id } });
            await startProgress(tx);
            return wo;
        })
    );

    // Giống POST /api/work-orders: báo Zalo cho người được giao việc
    if (order.assignee) {
        notifyWorkOrderAssigned(order).catch(e => console.error('[customer-issues work-orders] notify lỗi:', e));
    }
    return NextResponse.json(order, { status: 201 });
});
