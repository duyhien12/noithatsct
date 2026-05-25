import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const rows = await prisma.$queryRaw`
        SELECT latitude, longitude, "routeNotes", "siteContact", "siteContactPhone", "frontPhotos"
        FROM "Project" WHERE id = ${id}
    `;
    return NextResponse.json(rows[0] || {});
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const {
        latitude,
        longitude,
        routeNotes,
        siteContact,
        siteContactPhone,
        frontPhotos,
    } = body;

    const lat = (latitude !== null && latitude !== undefined && latitude !== '') ? Number(latitude) : null;
    const lng = (longitude !== null && longitude !== undefined && longitude !== '') ? Number(longitude) : null;
    const photosStr = JSON.stringify(frontPhotos || []);

    await prisma.$executeRaw`
        UPDATE "Project"
        SET latitude              = ${lat},
            longitude             = ${lng},
            "routeNotes"          = ${routeNotes ?? ''},
            "siteContact"         = ${siteContact ?? ''},
            "siteContactPhone"    = ${siteContactPhone ?? ''},
            "frontPhotos"         = CAST(${photosStr} AS jsonb),
            "updatedAt"           = NOW()
        WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
});
