import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const logs = await prisma.workOrderStageLog.findMany({
        where: { workOrderId: id },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(logs);
});
