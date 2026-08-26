import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission, hasInvPermission } from '@/lib/inventoryV2/permissions';
import { docTypeMeta } from '@/lib/inventoryV2/workflow';
import { buildDocumentLines } from '@/lib/inventoryV2/documentLines';
import { withDailyCodeRetry } from '@/lib/generateCode';

export const GET = withAuth(async (request, ctx, session) => {
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('docType') || undefined;
    const docTypeGroup = searchParams.get('group'); // 'import' | 'export' | 'transfer'
    const status = searchParams.get('status') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 1000);
    const offset = Number(searchParams.get('offset')) || 0;

    const where = {
        ...(docType ? { docType } : {}),
        ...(docTypeGroup ? { docType: { startsWith: docTypeGroup.toUpperCase() } } : {}),
        ...(status ? { status } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(dateFrom || dateTo ? { docDate: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } } : {}),
    };

    const [data, total] = await Promise.all([
        prisma.invDocument.findMany({
            where, take: limit, skip: offset, orderBy: { createdAt: 'desc' },
            include: {
                warehouse: { select: { id: true, name: true } },
                targetWarehouse: { select: { id: true, name: true } },
                project: { select: { id: true, code: true, name: true } },
                supplier: { select: { id: true, name: true } },
                mfgOrder: { select: { id: true, code: true, title: true } },
                lines: { select: { id: true } },
            },
        }),
        prisma.invDocument.count({ where }),
    ]);

    const canViewCost = hasInvPermission(session.user, 'view_cost');
    const result = canViewCost ? data : data.map(({ totalAmount, ...d }) => d);
    return NextResponse.json({ data: result, total, limit, offset });
});

export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'create_document');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const { docType, warehouseId, lines } = body;
    if (!docType || !warehouseId) return NextResponse.json({ error: 'Thiếu loại phiếu hoặc kho' }, { status: 400 });

    let meta;
    try { meta = docTypeMeta(docType); } catch (err) { return NextResponse.json({ error: err.message }, { status: 400 }); }

    if (meta.class === 'TRANSFER' && !body.targetWarehouseId) {
        return NextResponse.json({ error: 'Phiếu điều chuyển cần chọn kho đích' }, { status: 400 });
    }
    if ((meta.class === 'RESERVE' || meta.class === 'RELEASE') && !body.projectId && !body.mfgOrderId && !body.scheduleTaskId) {
        return NextResponse.json({ error: 'Phiếu giữ/hủy giữ vật tư cần gắn công trình, lệnh sản xuất hoặc hạng mục' }, { status: 400 });
    }

    let linesData, totalAmount;
    try { ({ linesData, totalAmount } = await buildDocumentLines(lines)); }
    catch (err) { return NextResponse.json({ error: err.message }, { status: err.status || 400 }); }

    const document = await withDailyCodeRetry('invDocument', meta.prefix, (code) => prisma.invDocument.create({
        data: {
            code, docType, direction: meta.direction, status: 'DRAFT',
            docDate: body.docDate ? new Date(body.docDate) : new Date(),
            warehouseId, targetWarehouseId: body.targetWarehouseId || null,
            supplierId: body.supplierId || null, projectId: body.projectId || null,
            mfgOrderId: body.mfgOrderId || null, scheduleTaskId: body.scheduleTaskId || null,
            delivererName: body.delivererName || '', receiverName: body.receiverName || '',
            departmentReceiving: body.departmentReceiving || '', employeeReceivingId: body.employeeReceivingId || '',
            reason: body.reason || '', notes: body.notes || '',
            totalAmount, createdById: session.user.id,
            lines: { create: linesData },
        },
        include: { lines: true },
    }));

    return NextResponse.json(document, { status: 201 });
});
