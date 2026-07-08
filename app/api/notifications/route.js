import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: danh sách thông báo của người dùng hiện tại + số chưa đọc
export const GET = withAuth(async (request, context, session) => {
    const userId = session.user.id;
    const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
        }),
        prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return NextResponse.json({ notifications, unreadCount });
});

// PUT: đánh dấu tất cả thông báo đã đọc
export const PUT = withAuth(async (request, context, session) => {
    await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
    });
    return NextResponse.json({ success: true });
});
