import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Public API — khách hàng không cần auth, chỉ cần project code hợp lệ

async function getProject(code) {
    return prisma.project.findFirst({ where: { code }, select: { id: true } });
}

export async function GET(req, { params }) {
    const { code } = await params;
    const project = await getProject(code);
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const after = searchParams.get('after');

    if (after) {
        const msgs = await prisma.projectChatMsg.findMany({
            where: { projectId: project.id, createdAt: { gt: new Date(after) } },
            orderBy: { createdAt: 'asc' },
            take: 50,
        });
        return NextResponse.json(msgs);
    }

    const msgs = await prisma.projectChatMsg.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return NextResponse.json(msgs.reverse());
}

export async function POST(req, { params }) {
    const { code } = await params;
    const project = await getProject(code);
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const body = await req.json();
    const { content = '', images = [], senderName = 'Khách hàng' } = body;

    if (!content.trim() && images.length === 0) {
        return NextResponse.json({ error: 'Tin nhắn trống' }, { status: 400 });
    }

    const msg = await prisma.projectChatMsg.create({
        data: {
            projectId: project.id,
            content: content.trim(),
            images: JSON.stringify(Array.isArray(images) ? images : []),
            senderName: senderName.trim() || 'Khách hàng',
            senderType: 'customer',
            senderRole: 'customer',
        },
    });
    return NextResponse.json(msg, { status: 201 });
}
