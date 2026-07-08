import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { findMentionedNames } from '@/lib/mentions';
import { notifyMention } from '@/lib/notify';

const cuid = () => randomBytes(12).toString('base64url').replace(/[^a-z0-9]/gi, '').slice(0, 24);

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const comments = await prisma.$queryRaw`
        SELECT id, "customerId", content, author, attachments, "createdAt"
        FROM "CustomerComment"
        WHERE "customerId" = ${id}
        ORDER BY "createdAt" ASC
    `;
    return NextResponse.json(comments);
});

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { content, attachments } = await request.json();
    if (!content?.trim() && (!attachments || attachments.length === 0)) {
        return NextResponse.json({ error: 'Thiếu nội dung' }, { status: 400 });
    }

    const newId = cuid();
    const author = session?.user?.name || '';
    const now = new Date();
    const attachmentsJson = attachments?.length ? JSON.stringify(attachments) : null;

    await prisma.$executeRaw`
        INSERT INTO "CustomerComment" (id, "customerId", content, author, attachments, "createdAt")
        VALUES (${newId}, ${id}, ${(content || '').trim()}, ${author}, ${attachmentsJson}, ${now})
    `;

    const trimmedContent = (content || '').trim();
    if (trimmedContent) {
        const activeUsers = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } });
        const mentionedNames = findMentionedNames(trimmedContent, activeUsers.map(u => u.name));
        const mentionedUserIds = activeUsers
            .filter(u => mentionedNames.includes(u.name) && u.id !== session?.user?.id)
            .map(u => u.id);
        if (mentionedUserIds.length) {
            const customer = await prisma.customer.findUnique({ where: { id }, select: { name: true } });
            await notifyMention({
                userIds: mentionedUserIds,
                actorName: author,
                message: `${author} đã nhắc đến bạn trong ghi chú khách hàng "${customer?.name || ''}"`,
                link: `/customers/${id}?tab=comments`,
            });
        }
    }

    return NextResponse.json({
        id: newId,
        customerId: id,
        content: (content || '').trim(),
        author,
        attachments: attachmentsJson,
        createdAt: now,
    }, { status: 201 });
});
