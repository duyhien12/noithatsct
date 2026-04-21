import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req, { params }, session) => {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const after = searchParams.get('after');

    if (after) {
        const msgs = await prisma.projectChatMsg.findMany({
            where: { projectId: id, createdAt: { gt: new Date(after) } },
            orderBy: { createdAt: 'asc' },
            take: 50,
        });
        return NextResponse.json(msgs);
    }

    // Lần đầu: lấy 100 tin gần nhất
    const msgs = await prisma.projectChatMsg.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return NextResponse.json(msgs.reverse());
});

export const POST = withAuth(async (req, { params }, session) => {
    const { id } = await params;
    const body = await req.json();
    const { content = '', images = [] } = body;

    if (!content.trim() && images.length === 0) {
        return NextResponse.json({ error: 'Tin nhắn trống' }, { status: 400 });
    }

    const msg = await prisma.projectChatMsg.create({
        data: {
            projectId: id,
            content: content.trim(),
            images: JSON.stringify(Array.isArray(images) ? images : []),
            senderName: session.user.name || session.user.email,
            senderType: 'staff',
            senderRole: session.user.role || '',
        },
    });
    return NextResponse.json(msg, { status: 201 });
});
