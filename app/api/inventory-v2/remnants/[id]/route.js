import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { assertInvPermission } from '@/lib/inventoryV2/permissions';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const remnant = await prisma.invMaterialRemnant.findUnique({
        where: { id },
        include: { parentMaterial: true, material: true, warehouse: true, location: true, sourceProject: { select: { id: true, code: true, name: true } } },
    });
    if (!remnant) return NextResponse.json({ error: 'Không tìm thấy ván thừa' }, { status: 404 });
    return NextResponse.json(remnant);
});

export const PUT = withAuth(async (request, { params }, session) => {
    const permErr = assertInvPermission(session, 'create_document');
    if (permErr) return NextResponse.json({ error: permErr.error }, { status: permErr.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const remnant = await prisma.invMaterialRemnant.update({
        where: { id },
        data: { status: body.status, locationId: body.locationId, photo: body.photo, notes: body.notes },
    });
    return NextResponse.json(remnant);
});
