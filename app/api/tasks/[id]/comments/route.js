import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { findMentionedNames } from '@/lib/mentions';
import { notifyMention } from '@/lib/notify';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const comments = await prisma.taskComment.findMany({
        where: { taskId: id },
        orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(comments);
});

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Thiếu nội dung' }, { status: 400 });

    const trimmedContent = content.trim();
    const author = session?.user?.name || '';

    const comment = await prisma.taskComment.create({
        data: {
            taskId: id,
            content: trimmedContent,
            author,
        },
    });

    const activeUsers = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } });
    const mentionedNames = findMentionedNames(trimmedContent, activeUsers.map(u => u.name));
    const mentionedUsers = activeUsers.filter(u => mentionedNames.includes(u.name) && u.id !== session?.user?.id);
    let notifiedNames = [];
    if (mentionedUsers.length) {
        const task = await prisma.task.findUnique({ where: { id }, select: { title: true } });
        await notifyMention({
            userIds: mentionedUsers.map(u => u.id),
            actorName: author,
            actorUserId: session?.user?.id,
            message: `${author} đã nhắc đến bạn trong bình luận công việc "${task?.title || ''}"`,
            link: `/tasks?taskId=${id}`,
        });
        notifiedNames = mentionedUsers.map(u => u.name);
    }

    return NextResponse.json({ ...comment, notifiedNames }, { status: 201 });
});
