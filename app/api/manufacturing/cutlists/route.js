import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withCodeRetry } from '@/lib/generateCode';
import { writeAudit } from '@/lib/manufacturing/audit';
import { getCutlistPermissions } from '@/lib/manufacturing/cutlist';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const mfgOrderId = searchParams.get('mfgOrderId');
    const search = (searchParams.get('search') || '').trim();

    const where = {};
    if (status) where.status = status;
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { drawingRef: { contains: search, mode: 'insensitive' } },
            { mfgOrder: { code: { contains: search, mode: 'insensitive' } } },
            { project: { name: { contains: search, mode: 'insensitive' } } },
            { project: { code: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const data = await prisma.mfgCutlist.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 300,
        include: {
            mfgOrder: { select: { id: true, code: true, title: true } },
            project: { select: { id: true, code: true, name: true } },
            _count: { select: { lines: true } },
        },
    });
    return NextResponse.json({ data });
});

export const POST = withAuth(async (request, ctx, session) => {
    if (!getCutlistPermissions(session.user).edit) {
        return NextResponse.json({ error: 'Bạn không có quyền lập bảng bóc tách' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    if (!body.mfgOrderId) return NextResponse.json({ error: 'Chọn lệnh sản xuất' }, { status: 400 });

    const order = await prisma.mfgOrder.findFirst({ where: { id: body.mfgOrderId, deletedAt: null }, select: { id: true, projectId: true, status: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });
    if (order.status === 'CANCELLED') return NextResponse.json({ error: 'Lệnh sản xuất đã hủy' }, { status: 409 });

    const now = new Date();
    const prefix = `BT-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}-`;
    const purGram = body.purGramPerMeter === '' || body.purGramPerMeter == null ? null : Number(body.purGramPerMeter);

    const cutlist = await withCodeRetry('mfgCutlist', prefix, (code) => prisma.$transaction(async (tx) => {
        const created = await tx.mfgCutlist.create({
            data: {
                code,
                mfgOrderId: order.id,
                projectId: order.projectId,
                title: String(body.title || '').trim(),
                drawingRef: String(body.drawingRef || '').trim(),
                drawingRevision: String(body.drawingRevision || '').trim(),
                wastePercent: Number(body.wastePercent) || 0,
                purGramPerMeter: Number.isFinite(purGram) ? purGram : null,
                note: String(body.note || '').trim(),
                createdById: session.user.id,
                updatedById: session.user.id,
            },
        });
        await writeAudit(tx, { entityType: 'MfgCutlist', entityId: created.id, action: 'CREATE', toStatus: 'DRAFT', session });
        return created;
    }), 3);

    return NextResponse.json(cutlist, { status: 201 });
});
