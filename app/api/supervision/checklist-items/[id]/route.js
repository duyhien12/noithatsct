import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { status, note, photos } = await request.json();

    const existing = await prisma.supervisionChecklistItem.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy hạng mục' }, { status: 404 });

    const updated = await prisma.supervisionChecklistItem.update({
        where: { id },
        data: {
            status: status || existing.status,
            note: note !== undefined ? note : existing.note,
            photos: photos !== undefined ? JSON.stringify(photos) : existing.photos,
            checkedBy: status && status !== 'pending' ? (session?.user?.name || '') : existing.checkedBy,
            checkedAt: status && status !== 'pending' ? new Date() : existing.checkedAt,
        },
    });
    return NextResponse.json(updated);
});
