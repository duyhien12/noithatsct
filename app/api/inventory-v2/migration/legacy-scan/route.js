import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';
import { scanLegacyData, detectDuplicatesAndUnitMismatches } from '@/lib/inventoryV2/legacyMigration';

export const GET = withAuth(async (request, ctx, session) => {
    const permErr = assertInvPermission(session, 'migration_scan');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { products, warehouses } = await scanLegacyData();
    const flags = await detectDuplicatesAndUnitMismatches(products);
    return NextResponse.json({ products, warehouses, flags });
});
