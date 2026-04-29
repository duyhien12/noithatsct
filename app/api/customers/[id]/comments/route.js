import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const cuid = () => randomBytes(12).toString('base64url').replace(/[^a-z0-9]/gi, '').slice(0, 24);

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const comments = await prisma.$queryRaw`
        SELECT id, "customerId", content, author, "createdAt"
        FROM "CustomerComment"
        WHERE "customerId" = ${id}
        ORDER BY "createdAt" ASC
    `;
    return NextResponse.json(comments);
});

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Thiếu nội dung' }, { status: 400 });

    const newId = cuid();
    const author = session?.user?.name || '';
    const now = new Date();

    await prisma.$executeRaw`
        INSERT INTO "CustomerComment" (id, "customerId", content, author, "createdAt")
        VALUES (${newId}, ${id}, ${content.trim()}, ${author}, ${now})
    `;

    return NextResponse.json({ id: newId, customerId: id, content: content.trim(), author, createdAt: now }, { status: 201 });
});
