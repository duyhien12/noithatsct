import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { notifyMention } from '@/lib/notify';

// POST: tạo thông báo @tag cho các trường ghi chú tự do (vd: Ghi chú trong Quy trình bán hàng)
// Client tự xác định tên nào là mới được tag (so với lần lưu trước) rồi gửi lên đây.
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { names, context } = await request.json();
    if (!Array.isArray(names) || !names.length) return NextResponse.json({ notified: 0 });

    const author = session?.user?.name || '';
    const users = await prisma.user.findMany({
        where: { active: true, name: { in: names } },
        select: { id: true, name: true },
    });
    const mentionedUsers = users.filter(u => u.id !== session?.user?.id);
    if (!mentionedUsers.length) return NextResponse.json({ notified: 0, names: [] });

    const customer = await prisma.customer.findUnique({ where: { id }, select: { name: true } });
    await notifyMention({
        userIds: mentionedUsers.map(u => u.id),
        actorName: author,
        actorUserId: session?.user?.id,
        message: `${author} đã nhắc đến bạn trong ${context || 'ghi chú'} của khách hàng "${customer?.name || ''}"`,
        link: `/customers/${id}?tab=process`,
    });

    return NextResponse.json({ notified: mentionedUsers.length, names: mentionedUsers.map(u => u.name) });
});
