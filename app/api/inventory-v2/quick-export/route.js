import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission, hasInvPermission } from '@/lib/inventoryV2/permissions';
import { docTypeMeta } from '@/lib/inventoryV2/workflow';
import { buildDocumentLines } from '@/lib/inventoryV2/documentLines';
import { InsufficientStockError } from '@/lib/inventoryV2/costing';
import { postApprovedDocument } from '@/lib/inventoryV2/posting';
import { writeInvAudit } from '@/lib/inventoryV2/audit';
import { withDailyCodeRetry } from '@/lib/generateCode';

const QUICK_EXPORT_TYPES = ['EXPORT_PROJECT', 'EXPORT_PRODUCTION'];

/**
 * Xuất nhanh 1 vật tư từ bảng Tồn kho: gộp Tạo phiếu → Gửi duyệt → Duyệt thành 1 bước.
 * Người có quyền duyệt: phiếu được ghi sổ ngay (APPROVED) trong cùng transaction — thiếu tồn thì
 * rollback, không để lại phiếu nháp. Người không có quyền duyệt: phiếu dừng ở Chờ duyệt.
 */
export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'create_document');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const { docType, materialId, warehouseId, quantity, docDate, projectId, notes } = body;
    if (!QUICK_EXPORT_TYPES.includes(docType)) return NextResponse.json({ error: 'Loại xuất không hợp lệ' }, { status: 400 });
    if (!materialId || !warehouseId) return NextResponse.json({ error: 'Thiếu vật tư hoặc kho' }, { status: 400 });
    if (!(Number(quantity) > 0)) return NextResponse.json({ error: 'Số lượng phải lớn hơn 0' }, { status: 400 });
    if (docDate && isNaN(new Date(docDate))) return NextResponse.json({ error: 'Ngày xuất không hợp lệ' }, { status: 400 });
    if (docType === 'EXPORT_PROJECT' && !projectId) return NextResponse.json({ error: 'Vui lòng chọn công trình' }, { status: 400 });

    let linesData, totalAmount;
    try { ({ linesData, totalAmount } = await buildDocumentLines([{ materialId, enteredQuantity: quantity }])); }
    catch (err) { return NextResponse.json({ error: err.message }, { status: err.status || 400 }); }

    const meta = docTypeMeta(docType);
    const canApprove = hasInvPermission(session.user, 'approve_document');
    const now = new Date();

    try {
        const document = await withDailyCodeRetry('invDocument', meta.prefix, (code) => prisma.$transaction(async (tx) => {
            const doc = await tx.invDocument.create({
                data: {
                    code, docType, direction: meta.direction, status: 'DRAFT',
                    docDate: docDate ? new Date(docDate) : now, warehouseId, projectId: projectId || null,
                    reason: 'Xuất nhanh từ bảng tồn kho', notes: notes || '',
                    totalAmount, createdById: session.user.id,
                    lines: { create: linesData },
                },
                include: { lines: true },
            });
            const toStatus = canApprove ? 'APPROVED' : 'PENDING_APPROVAL';
            if (canApprove) await postApprovedDocument(tx, doc, session, false);
            const updated = await tx.invDocument.update({
                where: { id: doc.id },
                data: {
                    status: toStatus, submittedById: session.user.id, submittedAt: now,
                    ...(canApprove ? { approvedById: session.user.id, approvedAt: now } : {}),
                },
            });
            await writeInvAudit(tx, {
                entityType: 'InvDocument', entityId: doc.id, action: canApprove ? 'APPROVE' : 'SUBMIT',
                fromStatus: 'DRAFT', toStatus, session, note: 'Xuất nhanh từ bảng tồn kho',
            });
            return updated;
        }));
        return NextResponse.json(document, { status: 201 });
    } catch (err) {
        if (err instanceof InsufficientStockError) {
            return NextResponse.json({ error: err.message, detail: err.detail }, { status: 409 });
        }
        throw err;
    }
});
