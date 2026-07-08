import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PUT: đánh dấu một thông báo đã đọc
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== session.user.id) {
        return NextResponse.json({ error: 'Không tìm thấy thông báo' }, { status: 404 });
    }
    const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
    return NextResponse.json(updated);
});
