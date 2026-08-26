import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';
import { commitMapping } from '@/lib/inventoryV2/legacyMigration';

/** Bước ghi dữ liệu DUY NHẤT của công cụ di trú — chỉ commit các mapping đã CONFIRMED. */
export const POST = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'migration_commit');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const body = await request.json().catch(() => ({}));
    const mappingIds = Array.isArray(body.mappingIds) ? body.mappingIds : [];
    if (mappingIds.length === 0) return NextResponse.json({ error: 'Thiếu danh sách mapping cần commit' }, { status: 400 });

    const results = [];
    const errors = [];
    for (const mappingId of mappingIds) {
        try {
            const mapping = await prisma.invMigrationMapping.findUniqueOrThrow({ where: { id: mappingId } });
            const result = await prisma.$transaction((tx) => commitMapping(tx, mapping, session));
            results.push({ mappingId, ...result });
        } catch (err) {
            errors.push({ mappingId, message: err.message });
        }
    }

    return NextResponse.json({ results, errors });
});
