import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const document = await prisma.invDocument.findUnique({ where: { id }, select: { id: true } });
    if (!document) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    if (!body.url) return NextResponse.json({ error: 'Thiếu url tệp đính kèm' }, { status: 400 });

    const attachment = await prisma.invAttachment.create({
        data: {
            entityType: 'InvDocument', entityId: id, documentId: id,
            url: body.url, thumbnailUrl: body.thumbnailUrl || '', fileName: body.fileName || '',
            mimeType: body.mimeType || '', caption: body.caption || '',
            uploadedById: session.user.id, uploadedByName: session.user.name || '',
        },
    });
    return NextResponse.json(attachment, { status: 201 });
});
