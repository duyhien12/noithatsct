import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const docs = await prisma.projectDocument.findMany({
        where: { supplierId: id },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(docs);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { name, fileName, category, fileSize, fileUrl, mimeType, uploadedBy, notes } = body;
    if (!name?.trim() || !fileUrl) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

    const doc = await prisma.projectDocument.create({
        data: {
            supplierId: id,
            name: name.trim(),
            fileName: fileName || name.trim(),
            category: category || 'Khác',
            fileSize: fileSize || 0,
            fileUrl,
            mimeType: mimeType || '',
            uploadedBy: uploadedBy || '',
            notes: notes || '',
        },
    });
    return NextResponse.json(doc, { status: 201 });
});
