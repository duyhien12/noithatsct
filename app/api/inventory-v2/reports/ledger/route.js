import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasInvPermission } from '@/lib/inventoryV2/permissions';

/** Sổ kho toàn công ty (mục 10 spec) — báo cáo luôn khớp với InvStockLedger vì đây chính là nó. */
export const GET = withAuth(async (request, ctx, session) => {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const materialId = searchParams.get('materialId') || undefined;
    const docType = searchParams.get('docType') || undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 2000);

    const rows = await prisma.invStockLedger.findMany({
        where: {
            ...(warehouseId ? { warehouseId } : {}),
            ...(materialId ? { materialId } : {}),
            ...(docType ? { document: { docType } } : {}),
            ...(dateFrom || dateTo ? { postedAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) } } : {}),
        },
        orderBy: { postedAt: 'desc' }, take: limit,
        include: {
            material: { select: { id: true, sku: true, name: true } },
            warehouse: { select: { id: true, name: true } },
            document: { select: { id: true, code: true, docType: true, projectId: true } },
        },
    });

    const canViewCost = hasInvPermission(session.user, 'view_cost');
    const data = canViewCost ? rows : rows.map(({ unitCostAtPosting, amount, balanceAvgCostAfter, ...r }) => r);
    return NextResponse.json({ data });
});
