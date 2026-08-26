import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    if (!entityType || !entityId) return NextResponse.json({ error: 'Thiếu entityType hoặc entityId' }, { status: 400 });

    const data = await prisma.invAuditLog.findMany({
        where: { entityType, entityId }, orderBy: { createdAt: 'desc' }, take: 100,
    });
    return NextResponse.json({ data });
});
