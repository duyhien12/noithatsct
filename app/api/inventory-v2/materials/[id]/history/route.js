import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasInvPermission } from '@/lib/inventoryV2/permissions';

export const GET = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 1000);

    const rows = await prisma.invStockLedger.findMany({
        where: { materialId: id, ...(warehouseId ? { warehouseId } : {}) },
        orderBy: { postedAt: 'desc' },
        take: limit,
        include: {
            warehouse: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
            document: { select: { id: true, code: true, docType: true, projectId: true, mfgOrderId: true } },
        },
    });

    const canViewCost = hasInvPermission(session.user, 'view_cost');
    const data = canViewCost ? rows : rows.map(({ unitCostAtPosting, amount, balanceAvgCostAfter, ...r }) => r);
    return NextResponse.json({ data });
});
