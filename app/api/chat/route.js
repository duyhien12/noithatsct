import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const ALLOWED_ROLES = ['xuong', 'ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const GET = withAuth(async (req, _ctx, session) => {
    const { searchParams } = new URL(req.url);
    const after = searchParams.get('after'); // ISO timestamp — chỉ lấy tin mới hơn

    const where = after ? { createdAt: { gt: new Date(after) } } : {};

    const messages = await prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: after ? 50 : 80, // lần đầu lấy 80 tin gần nhất
    });

    // Nếu lần đầu (không có after), lấy 80 tin cuối
    if (!after) {
        const all = await prisma.chatMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: 80,
        });
        return NextResponse.json(all.reverse());
    }

    return NextResponse.json(messages);
});

export const POST = withAuth(async (req, _ctx, session) => {
    const body = await req.json();
    const { content = '', images = [] } = body;

    if (!content.trim() && images.length === 0) {
        return NextResponse.json({ error: 'Tin nhắn trống' }, { status: 400 });
    }

    const msg = await prisma.chatMessage.create({
        data: {
            content: content.trim(),
            images: JSON.stringify(Array.isArray(images) ? images : []),
            userId: session.user.id || session.user.email,
            userName: session.user.name || session.user.email,
            userRole: session.user.role || '',
        },
    });

    return NextResponse.json(msg, { status: 201 });
});
