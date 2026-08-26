import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission, hasInvPermission } from '@/lib/inventoryV2/permissions';
import { assertDocumentEditable, assertDocumentCanCancel, STATUS_LABELS } from '@/lib/inventoryV2/workflow';
import { buildDocumentLines } from '@/lib/inventoryV2/documentLines';

export const GET = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const document = await prisma.invDocument.findUnique({
        where: { id },
        include: {
            warehouse: true, targetWarehouse: true, supplier: true, project: true, mfgOrder: true, scheduleTask: true,
            sourceDocument: { select: { id: true, code: true } },
            reversals: { select: { id: true, code: true, status: true } },
            attachments: true,
            lines: {
                orderBy: { lineNo: 'asc' },
                include: {
                    material: { select: { id: true, sku: true, name: true, image: true } },
                    enteredUnit: { select: { id: true, code: true } },
                },
            },
        },
    });
    if (!document) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    const auditLog = await prisma.invAuditLog.findMany({
        where: { entityType: 'InvDocument', entityId: id }, orderBy: { createdAt: 'desc' },
    });

    const canViewCost = hasInvPermission(session.user, 'view_cost');
    const result = { ...document, statusLabel: STATUS_LABELS[document.status], auditLog };
    if (!canViewCost) {
        delete result.totalAmount;
        result.lines = result.lines.map(({ unitPrice, amount, avgCostAtPosting, ...l }) => l);
    }
    return NextResponse.json(result);
});

export const PUT = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'create_document');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const document = await prisma.invDocument.findUnique({ where: { id } });
    if (!document) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    const editErr = assertDocumentEditable(document);
    if (editErr) return NextResponse.json({ error: editErr.error }, { status: editErr.status });

    const body = await request.json().catch(() => ({}));

    let linesData, totalAmount;
    if (body.lines) {
        try { ({ linesData, totalAmount } = await buildDocumentLines(body.lines)); }
        catch (err) { return NextResponse.json({ error: err.message }, { status: err.status || 400 }); }
    }

    const updated = await prisma.$transaction(async (tx) => {
        if (linesData) {
            await tx.invDocumentLine.deleteMany({ where: { documentId: id } });
        }
        return tx.invDocument.update({
            where: { id },
            data: {
                docDate: body.docDate ? new Date(body.docDate) : undefined,
                targetWarehouseId: body.targetWarehouseId, supplierId: body.supplierId, projectId: body.projectId,
                mfgOrderId: body.mfgOrderId, scheduleTaskId: body.scheduleTaskId,
                delivererName: body.delivererName, receiverName: body.receiverName,
                departmentReceiving: body.departmentReceiving, employeeReceivingId: body.employeeReceivingId,
                reason: body.reason, notes: body.notes,
                ...(linesData ? { totalAmount, lines: { create: linesData } } : {}),
            },
            include: { lines: true },
        });
    });

    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'create_document');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const document = await prisma.invDocument.findUnique({ where: { id } });
    if (!document) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    const cancelErr = assertDocumentCanCancel(document);
    if (document.status !== 'DRAFT' && cancelErr) {
        return NextResponse.json({ error: cancelErr.error }, { status: cancelErr.status });
    }
    await prisma.invDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
