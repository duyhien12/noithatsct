import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';
import { docTypeMeta } from '@/lib/inventoryV2/workflow';
import { withDailyCodeRetry } from '@/lib/generateCode';

/**
 * Phiếu đã Đã duyệt là bất biến — sai thì lập phiếu đảo (Nháp, phải duyệt lại từ đầu),
 * không sửa/xóa phiếu gốc. Mapping loại phiếu đảo theo class nghiệp vụ của phiếu gốc.
 */
function reversalDocType(docType) {
    const meta = docTypeMeta(docType);
    if (meta.class === 'LEDGER') return meta.direction === 'IN' ? 'EXPORT_STOCKTAKE_ADJUST' : 'IMPORT_STOCKTAKE_ADJUST';
    if (meta.class === 'RESERVE') return 'RELEASE_HOLD';
    if (meta.class === 'RELEASE') return 'HOLD';
    if (meta.class === 'TRANSFER') return docType;
    throw new Error('Không thể lập phiếu đảo cho loại phiếu này');
}

export const POST = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'create_document');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const source = await prisma.invDocument.findUnique({ where: { id }, include: { lines: true } });
    if (!source) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (source.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Chỉ lập phiếu đảo cho phiếu đã Đã duyệt' }, { status: 400 });
    }

    let newDocType;
    try { newDocType = reversalDocType(source.docType); }
    catch (err) { return NextResponse.json({ error: err.message }, { status: 400 }); }
    const meta = docTypeMeta(newDocType);

    const isTransfer = meta.class === 'TRANSFER';
    const document = await withDailyCodeRetry('invDocument', meta.prefix, (code) => prisma.invDocument.create({
        data: {
            code, docType: newDocType, direction: meta.direction, status: 'DRAFT',
            warehouseId: isTransfer ? source.targetWarehouseId || source.warehouseId : source.warehouseId,
            targetWarehouseId: isTransfer ? source.warehouseId : null,
            supplierId: source.supplierId, projectId: source.projectId, mfgOrderId: source.mfgOrderId, scheduleTaskId: source.scheduleTaskId,
            reason: `Phiếu đảo của ${source.code}${body.reason ? ' — ' + body.reason : ''}`,
            notes: body.notes || '',
            sourceDocumentId: source.id,
            totalAmount: source.totalAmount,
            createdById: session.user.id,
            lines: {
                create: source.lines.map((l, i) => ({
                    lineNo: i, materialId: l.materialId,
                    locationId: isTransfer ? l.targetLocationId : l.locationId,
                    targetLocationId: isTransfer ? l.locationId : null,
                    enteredQuantity: l.enteredQuantity, enteredUnitId: l.enteredUnitId, ratioToStockUsed: l.ratioToStockUsed,
                    quantity: l.quantity, unitPrice: l.unitPrice, amount: l.amount, note: `Đảo dòng #${i + 1} của ${source.code}`,
                })),
            },
        },
        include: { lines: true },
    }));

    return NextResponse.json(document, { status: 201 });
});
