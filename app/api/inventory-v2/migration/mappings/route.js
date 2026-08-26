import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const GET = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'migration_scan');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const data = await prisma.invMigrationMapping.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { targetMaterial: { select: { id: true, sku: true, name: true } } },
    });
    return NextResponse.json({ data });
});

/** Xác nhận quyết định merge/tạo mới cho từng dòng — CHƯA ghi dữ liệu, chỉ lưu quyết định (status CONFIRMED). */
export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'migration_scan');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const rows = Array.isArray(body.mappings) ? body.mappings : [];
    if (rows.length === 0) return NextResponse.json({ error: 'Thiếu danh sách quyết định' }, { status: 400 });

    const results = [];
    for (const r of rows) {
        if (!r.legacyProductId || !r.decision) continue;
        const mapping = await prisma.invMigrationMapping.upsert({
            where: { legacyProductId_legacyWarehouseId: { legacyProductId: r.legacyProductId, legacyWarehouseId: r.legacyWarehouseId || null } },
            create: {
                legacyProductId: r.legacyProductId, legacyWarehouseId: r.legacyWarehouseId || null,
                decision: r.decision, targetMaterialId: r.targetMaterialId || null, targetWarehouseId: r.targetWarehouseId || null,
                status: 'CONFIRMED', confirmedById: session.user.id, confirmedAt: new Date(), notes: r.notes || '',
            },
            update: {
                decision: r.decision, targetMaterialId: r.targetMaterialId || null, targetWarehouseId: r.targetWarehouseId || null,
                status: 'CONFIRMED', confirmedById: session.user.id, confirmedAt: new Date(), notes: r.notes || '',
            },
        });
        results.push(mapping);
    }
    return NextResponse.json({ data: results });
});
