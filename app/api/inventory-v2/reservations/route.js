import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ACTIVE';
    const materialId = searchParams.get('materialId') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;

    const data = await prisma.invStockReservation.findMany({
        where: {
            ...(status !== 'all' ? { status } : {}),
            ...(materialId ? { materialId } : {}),
            ...(warehouseId ? { warehouseId } : {}),
            ...(projectId ? { projectId } : {}),
        },
        orderBy: { reservedAt: 'desc' },
        include: {
            material: { select: { id: true, sku: true, name: true, stockUnit: { select: { code: true } } } },
            warehouse: { select: { id: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
            mfgOrder: { select: { id: true, code: true, title: true } },
            document: { select: { id: true, code: true } },
        },
    });
    return NextResponse.json({ data });
});
