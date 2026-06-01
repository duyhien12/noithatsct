import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (req, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const after = searchParams.get('after');

    const where = { projectId: id, senderType: 'diary' };
    if (after) where.createdAt = { gt: new Date(after) };

    const entries = await prisma.projectChatMsg.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: after ? 50 : 200,
    });

    return NextResponse.json(after ? entries : entries.reverse());
});

export const POST = withAuth(async (req, { params }, session) => {
    const { id } = await params;
    const { content = '', images = [] } = await req.json();

    if (!content.trim() && images.length === 0) {
        return NextResponse.json({ error: 'Bài đăng trống' }, { status: 400 });
    }

    const entry = await prisma.projectChatMsg.create({
        data: {
            projectId: id,
            content: content.trim(),
            images: JSON.stringify(Array.isArray(images) ? images : []),
            senderName: session.user.name || session.user.email,
            senderType: 'diary',
            senderRole: session.user.role || '',
        },
    });
    return NextResponse.json(entry, { status: 201 });
});

export const DELETE = withAuth(async (req, { params }, session) => {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get('entryId');
    if (!entryId) return NextResponse.json({ error: 'Thiếu entryId' }, { status: 400 });

    const entry = await prisma.projectChatMsg.findUnique({ where: { id: entryId } });
    if (!entry || entry.projectId !== id || entry.senderType !== 'diary') {
        return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    }

    const isOwner = entry.senderName === (session.user.name || session.user.email);
    const isAdmin = ['ban_gd', 'giam_doc', 'pho_gd'].includes(session.user.role);
    if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    await prisma.projectChatMsg.delete({ where: { id: entryId } });
    return NextResponse.json({ ok: true });
});
