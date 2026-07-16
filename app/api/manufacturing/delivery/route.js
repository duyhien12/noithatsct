import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import { deliveryRecordCreateSchema } from '@/lib/validations/manufacturing';
import { hasMfgPermission } from '@/lib/manufacturing/permissions';
import { assertCanDeliver } from '@/lib/manufacturing/workflow';
import { writeAudit } from '@/lib/manufacturing/audit';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const mfgOrderId = searchParams.get('mfgOrderId');
    const projectId = searchParams.get('projectId');
    const where = {};
    if (mfgOrderId) where.mfgOrderId = mfgOrderId;
    if (projectId) where.projectId = projectId;

    const [records, total] = await Promise.all([
        prisma.deliveryRecord.findMany({
            where,
            include: {
                mfgOrder: { select: { id: true, code: true } },
                project: { select: { id: true, code: true, name: true } },
                items: { include: { item: { select: { id: true, code: true, name: true } }, packingRecord: { select: { code: true } } } },
            },
            orderBy: { deliveryDate: 'desc' },
            skip, take: limit,
        }),
        prisma.deliveryRecord.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(records, total, { page, limit }));
});

export const POST = withAuth(async (request, ctx, session) => {
    if (!hasMfgPermission(session.user, 'deliver')) {
        return NextResponse.json({ error: 'Bạn không có quyền lập chuyến giao hàng' }, { status: 403 });
    }
    let data;
    try {
        data = deliveryRecordCreateSchema.parse(await request.json());
    } catch (e) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: e.errors }, { status: 400 });
    }

    const order = await prisma.mfgOrder.findFirst({ where: { id: data.mfgOrderId, deletedAt: null }, select: { id: true, projectId: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy lệnh sản xuất' }, { status: 404 });

    const itemIds = data.items.filter(i => i.mfgItemId).map(i => i.mfgItemId);
    const items = itemIds.length ? await prisma.mfgItem.findMany({ where: { id: { in: itemIds } } }) : [];
    for (const item of items) {
        const err = assertCanDeliver(item);
        if (err) return NextResponse.json({ error: `${item.code}: ${err}` }, { status: 400 });
    }

    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const record = await withCodeRetry('deliveryRecord', `DEL-${yymm}-`, (code) => prisma.$transaction(async (tx) => {
        const created = await tx.deliveryRecord.create({
            data: {
                code,
                mfgOrderId: data.mfgOrderId,
                projectId: order.projectId,
                deliveryDate: data.deliveryDate || now,
                vehicleNumber: data.vehicleNumber || '',
                driverName: data.driverName || '',
                driverPhone: data.driverPhone || '',
                carrierName: data.carrierName || '',
                deliveryContactName: data.deliveryContactName || '',
                deliveryContactPhone: data.deliveryContactPhone || '',
                note: data.note || '',
            },
        });
        await tx.deliveryItem.createMany({
            data: data.items.map(i => ({ deliveryRecordId: created.id, packingRecordId: i.packingRecordId || null, mfgItemId: i.mfgItemId || null, quantity: i.quantity })),
        });
        if (itemIds.length) {
            await tx.mfgItem.updateMany({ where: { id: { in: itemIds } }, data: { status: 'DELIVERED' } });
        }
        await writeAudit(tx, { entityType: 'DeliveryRecord', entityId: created.id, action: 'CREATE', session });
        return created;
    }), 4);

    return NextResponse.json(record, { status: 201 });
});
