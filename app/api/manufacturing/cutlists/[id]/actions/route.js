import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { writeAudit } from '@/lib/manufacturing/audit';
import { getCutlistPermissions, checkCutlist, CUTLIST_MATERIAL_SELECT } from '@/lib/manufacturing/cutlist';

const LINE_COPY_OMIT = ['id', 'cutlistId', 'material', 'edgeMaterial'];

/**
 * Luồng trạng thái bảng bóc tách:
 *   DRAFT --check--> CHECKED --approve--> APPROVED --revise--> (bản mới DRAFT, revision + 1)
 *   CHECKED --reopen--> DRAFT;  DRAFT/CHECKED/APPROVED --cancel--> CANCELLED
 * Bản mới được duyệt thì bản trước chuyển SUPERSEDED.
 */
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { action, reason } = await request.json().catch(() => ({}));
    const perms = getCutlistPermissions(session.user);

    const cutlist = await prisma.mfgCutlist.findUnique({
        where: { id },
        include: { lines: { orderBy: { sortOrder: 'asc' }, include: { material: CUTLIST_MATERIAL_SELECT, edgeMaterial: CUTLIST_MATERIAL_SELECT } } },
    });
    if (!cutlist) return NextResponse.json({ error: 'Không tìm thấy bảng bóc tách' }, { status: 404 });

    const deny = (msg) => NextResponse.json({ error: msg }, { status: 403 });
    const conflict = (msg) => NextResponse.json({ error: msg }, { status: 409 });
    const who = { id: session.user.id, name: session.user.name || '' };

    const transition = (toStatus, data = {}, note = '') => prisma.$transaction(async (tx) => {
        const updated = await tx.mfgCutlist.update({ where: { id }, data: { status: toStatus, updatedById: who.id, ...data } });
        await writeAudit(tx, { entityType: 'MfgCutlist', entityId: id, action: action.toUpperCase(), fromStatus: cutlist.status, toStatus, session, note });
        return updated;
    });

    switch (action) {
        case 'check': {
            if (!perms.edit) return deny('Bạn không có quyền chốt bảng bóc tách');
            if (cutlist.status !== 'DRAFT') return conflict('Chỉ chốt kiểm tra được bản Dự thảo');
            const errors = checkCutlist(cutlist, cutlist.lines).filter(i => i.severity === 'error');
            if (errors.length > 0) {
                return NextResponse.json({ error: `Còn ${errors.length} lỗi phải sửa trước khi chốt`, issues: errors }, { status: 422 });
            }
            return NextResponse.json(await transition('CHECKED', { checkedById: who.id, checkedByName: who.name, checkedAt: new Date() }));
        }
        case 'reopen': {
            if (!perms.edit) return deny('Bạn không có quyền mở lại bảng bóc tách');
            if (cutlist.status !== 'CHECKED') return conflict('Chỉ mở lại được bản đang chờ duyệt');
            return NextResponse.json(await transition('DRAFT', { checkedById: '', checkedByName: '', checkedAt: null }, reason || ''));
        }
        case 'approve': {
            if (!perms.approve) return deny('Chỉ Quản đốc / Ban giám đốc được duyệt bảng bóc tách');
            if (cutlist.status !== 'CHECKED') return conflict('Chỉ duyệt được bản đã kiểm tra');
            const errors = checkCutlist(cutlist, cutlist.lines).filter(i => i.severity === 'error');
            if (errors.length > 0) return NextResponse.json({ error: `Còn ${errors.length} lỗi — mở lại để sửa`, issues: errors }, { status: 422 });
            const updated = await prisma.$transaction(async (tx) => {
                const u = await tx.mfgCutlist.update({
                    where: { id },
                    data: { status: 'APPROVED', approvedById: who.id, approvedByName: who.name, approvedAt: new Date(), updatedById: who.id },
                });
                if (cutlist.previousId) {
                    await tx.mfgCutlist.updateMany({ where: { id: cutlist.previousId, status: 'APPROVED' }, data: { status: 'SUPERSEDED' } });
                }
                await writeAudit(tx, { entityType: 'MfgCutlist', entityId: id, action: 'APPROVE', fromStatus: 'CHECKED', toStatus: 'APPROVED', session });
                return u;
            });
            return NextResponse.json(updated);
        }
        case 'revise': {
            if (!perms.edit) return deny('Bạn không có quyền tạo bản sửa đổi');
            if (cutlist.status !== 'APPROVED') return conflict('Chỉ tạo bản sửa đổi từ bản đã duyệt');
            const open = await prisma.mfgCutlist.findFirst({ where: { previousId: id, status: { in: ['DRAFT', 'CHECKED'] } }, select: { code: true } });
            if (open) return conflict(`Đã có bản sửa đổi ${open.code} đang soạn`);
            const baseCode = cutlist.code.replace(/-R\d+$/, '');
            const revision = cutlist.revision + 1;
            const created = await prisma.$transaction(async (tx) => {
                const c = await tx.mfgCutlist.create({
                    data: {
                        code: `${baseCode}-R${revision}`,
                        mfgOrderId: cutlist.mfgOrderId, projectId: cutlist.projectId,
                        title: cutlist.title, revision,
                        drawingRef: cutlist.drawingRef, drawingRevision: cutlist.drawingRevision,
                        wastePercent: cutlist.wastePercent, purGramPerMeter: cutlist.purGramPerMeter,
                        note: cutlist.note, previousId: id,
                        createdById: who.id, updatedById: who.id,
                    },
                });
                if (cutlist.lines.length > 0) {
                    await tx.mfgCutlistLine.createMany({
                        data: cutlist.lines.map(l => ({
                            ...Object.fromEntries(Object.entries(l).filter(([k]) => !LINE_COPY_OMIT.includes(k))),
                            cutlistId: c.id,
                        })),
                    });
                }
                await writeAudit(tx, { entityType: 'MfgCutlist', entityId: c.id, action: 'REVISE', toStatus: 'DRAFT', session, note: `Sửa đổi từ ${cutlist.code}${reason ? ` — ${reason}` : ''}` });
                return c;
            });
            return NextResponse.json(created, { status: 201 });
        }
        case 'cancel': {
            if (['CANCELLED', 'SUPERSEDED'].includes(cutlist.status)) return conflict('Bảng bóc tách đã đóng');
            if (cutlist.status === 'APPROVED' ? !perms.approve : !perms.edit) return deny('Bạn không có quyền hủy bảng bóc tách này');
            if (!String(reason || '').trim()) return NextResponse.json({ error: 'Nhập lý do hủy' }, { status: 400 });
            return NextResponse.json(await transition('CANCELLED', {}, reason));
        }
        default:
            return NextResponse.json({ error: 'Thao tác không hợp lệ' }, { status: 400 });
    }
});
