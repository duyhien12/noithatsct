import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST: người được tag xác nhận đã nhận việc — gửi thông báo phản hồi lại người đã tag
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== session.user.id) {
        return NextResponse.json({ error: 'Không tìm thấy thông báo' }, { status: 404 });
    }

    const updated = await prisma.notification.update({
        where: { id },
        data: { acknowledged: true, acknowledgedAt: new Date(), read: true },
    });

    if (notif.actorUserId) {
        await prisma.notification.create({
            data: {
                userId: notif.actorUserId,
                type: 'ack',
                message: `${session.user.name} đã xác nhận nhận việc: "${notif.message}"`,
                link: notif.link,
                actorName: session.user.name || '',
                actorUserId: session.user.id,
            },
        });
    }

    return NextResponse.json(updated);
});
