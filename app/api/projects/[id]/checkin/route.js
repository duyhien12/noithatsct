import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const rows = await prisma.$queryRaw`
        SELECT id, type, "userName", lat, lng, address, notes, "createdAt"
        FROM "ProjectCheckIn"
        WHERE "projectId" = ${id}
        ORDER BY "createdAt" DESC
        LIMIT 50
    `;
    return NextResponse.json(rows);
});

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const { type, lat, lng, address, notes } = body;
    const userName = session?.user?.name || body.userName || '';
    const newId = randomUUID();

    const latVal = (lat !== null && lat !== undefined) ? Number(lat) : null;
    const lngVal = (lng !== null && lng !== undefined) ? Number(lng) : null;

    await prisma.$executeRaw`
        INSERT INTO "ProjectCheckIn" (id, type, "userName", lat, lng, address, notes, "projectId", "createdAt")
        VALUES (
            ${newId},
            ${type || 'check_in'},
            ${userName},
            ${latVal},
            ${lngVal},
            ${address || ''},
            ${notes || ''},
            ${id},
            NOW()
        )
    `;

    return NextResponse.json({ id: newId, success: true });
});
