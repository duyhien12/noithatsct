import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { packingRecordCreateSchema } from '@/lib/validations/manufacturing';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';
import { assertCanPack } from '@/lib/manufacturing/workflow';
import { writeAudit } from '@/lib/manufacturing/audit';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const mfgOrderId = searchParams.get('mfgOrderId');
    const where = {};
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;

    const [records, total] = await Promise.all([
        prisma.packingRecord.findMany({
            where,
            include: {
                mfgOrder: { select: { id: true, code: true, project: { select: { code: true, name: true } } } },
                items: { include: { item: { select: { id: true, code: true, name: true } } } },
            },
            orderBy: { packedAt: 'desc' },
            skip, take: limit,
        }),
        prisma.packingRecord.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(records, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    if (!hasMfgPermission(session.user, 'pack')) {
        return NextResponse.json({ error: 'Bạn không có quyền đóng gói' }, { status: 403 });
    }
    let data;
    try {
        data = packingRecordCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const order = await prisma.mfgOrder.findFirst({ where: { id: data.mfgOrderId, deletedAt: null }, select: { id: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    const itemIds = data.items.map(i => i.mfgItemId);
    const items = await prisma.mfgItem.findMany({ where: { id: { in: itemIds } } });
    if (items.length !== itemIds.length) return NextResponse.json({ error: 'Có sản phẩm không tồn tại' }, { status: 404 });
    for (const item of items) {
        const err = assertCanPack(item);
        if (err) return NextResponse.json({ error: `${item.code}: ${err}` }, { status: 400 });
    }

    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const record = await withCodeRetry('packingRecord', `PKG-${yymm}-`, (code) => prisma.$transaction(async (tx) => {
        const created = await tx.packingRecord.create({
            data: {
                code,
                mfgOrderId: data.mfgOrderId,
                packageType: data.packageType || '',
                quantity: data.items.reduce((s, i) => s + i.quantity, 0),
                packedById: session.user.id,
                note: data.note || '',
                qrCodeValue: '',
            },
        });
        await tx.packingItem.createMany({
            data: data.items.map(i => ({ packingRecordId: created.id, mfgItemId: i.mfgItemId, quantity: i.quantity })),
        });
        await tx.mfgItem.updateMany({ where: { id: { in: itemIds } }, data: { status: 'PACKED' } });
        await tx.packingRecord.update({ where: { id: created.id }, data: { qrCodeValue: `/manufacturing/packing/${created.id}` } });

        await writeAudit(tx, { entityType: 'PackingRecord', entityId: created.id, action: 'CREATE', session });
        return created;
    }), 4);

    return NextResponse.json(record, { status: 201 });
});
