import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { writeAudit } from '@/lib/manufacturing/audit';
import { getCutlistPermissions, sanitizeLine, CUTLIST_MATERIAL_SELECT } from '@/lib/manufacturing/cutlist';

/** Tồn khả dụng (onHand − đã giữ) cộng mọi kho, theo materialId. */
async function availableByMaterial(materialIds) {
    if (materialIds.length === 0) return {};
    const rows = await prisma.invStockBalance.groupBy({
        by: ['materialId'],
        where: { materialId: { in: materialIds } },
        _sum: { onHandQty: true, reservedQty: true },
    });
    return Object.fromEntries(rows.map(r => [r.materialId, Number(r._sum.onHandQty || 0) - Number(r._sum.reservedQty || 0)]));
}

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const cutlist = await prisma.mfgCutlist.findUnique({
        where: { id },
        include: {
            mfgOrder: {
                select: {
                    id: true, code: true, title: true, status: true,
                    items: { orderBy: { createdAt: 'asc' }, select: { id: true, code: true, name: true, roomName: true, quantity: true, unit: true } },
                },
            },
            project: { select: { id: true, code: true, name: true } },
            lines: {
                orderBy: { sortOrder: 'asc' },
                include: { material: CUTLIST_MATERIAL_SELECT, edgeMaterial: CUTLIST_MATERIAL_SELECT },
            },
        },
    });
    if (!cutlist) return NextResponse.json({ error: 'Không tìm thấy bảng bóc tách' }, { status: 404 });

    const ids = [...new Set(cutlist.lines.flatMap(l => [l.materialId, l.edgeMaterialId]).filter(Boolean))];
    const [available, revisions] = await Promise.all([
        availableByMaterial(ids),
        prisma.mfgCutlist.findMany({
            where: { mfgOrderId: cutlist.mfgOrderId },
            orderBy: [{ createdAt: 'asc' }],
            select: { id: true, code: true, revision: true, status: true, title: true, updatedAt: true },
        }),
    ]);

    return NextResponse.json({ ...cutlist, available, revisions, stockAsOf: new Date().toISOString() });
});

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    if (!getCutlistPermissions(session.user).edit) {
        return NextResponse.json({ error: 'Bạn không có quyền sửa bảng bóc tách' }, { status: 403 });
    }
    const existing = await prisma.mfgCutlist.findUnique({
        where: { id },
        include: { mfgOrder: { select: { items: { select: { id: true } } } } },
    });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bảng bóc tách' }, { status: 404 });
    if (existing.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Chỉ sửa được bản Dự thảo — bản đã duyệt phải tạo bản sửa đổi' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const orderItemIds = new Set(existing.mfgOrder.items.map(i => i.id));
    const lines = Array.isArray(body.lines)
        ? body.lines.map(sanitizeLine).map(l => ({ ...l, mfgItemId: orderItemIds.has(l.mfgItemId) ? l.mfgItemId : null }))
        : null;

    const header = {};
    for (const k of ['title', 'drawingRef', 'drawingRevision', 'note']) {
        if (body[k] !== undefined) header[k] = String(body[k] || '').trim();
    }
    if (body.wastePercent !== undefined) header.wastePercent = Math.max(0, Number(body.wastePercent) || 0);
    if (body.purGramPerMeter !== undefined) {
        const v = body.purGramPerMeter === '' || body.purGramPerMeter == null ? null : Number(body.purGramPerMeter);
        header.purGramPerMeter = Number.isFinite(v) ? v : null;
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.mfgCutlist.update({ where: { id }, data: { ...header, updatedById: session.user.id } });
            if (lines) {
                await tx.mfgCutlistLine.deleteMany({ where: { cutlistId: id } });
                if (lines.length > 0) await tx.mfgCutlistLine.createMany({ data: lines.map(l => ({ ...l, cutlistId: id })) });
            }
            await writeAudit(tx, { entityType: 'MfgCutlist', entityId: id, action: 'UPDATE', session, note: lines ? `${lines.length} dòng` : '' });
        });
    } catch (e) {
        if (e.code === 'P2003') return NextResponse.json({ error: 'Có mã vật tư không còn trong danh mục — tải lại trang và chọn lại' }, { status: 400 });
        throw e;
    }
    return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    if (!getCutlistPermissions(session.user).edit) {
        return NextResponse.json({ error: 'Bạn không có quyền xóa bảng bóc tách' }, { status: 403 });
    }
    const existing = await prisma.mfgCutlist.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bảng bóc tách' }, { status: 404 });
    if (existing.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Chỉ xóa được bản Dự thảo — bản khác dùng thao tác Hủy' }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
        await tx.mfgCutlist.delete({ where: { id } });
        await writeAudit(tx, { entityType: 'MfgCutlist', entityId: id, action: 'DELETE', fromStatus: 'DRAFT', session, note: existing.code });
    });
    return NextResponse.json({ ok: true });
});
