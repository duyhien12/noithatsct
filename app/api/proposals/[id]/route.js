import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const BAN_GD = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const role = session?.user?.role || '';
    const isAdmin = BAN_GD.includes(role);

    const existing = await prisma.proposal.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Người gửi chỉ có thể sửa nội dung khi đang ở trạng thái "Mới"
    // Quản lý có thể đổi status và phản hồi
    const data = {};

    if (isAdmin) {
        if (body.status) data.status = body.status;
        if (body.response !== undefined) data.response = body.response;
        if (body.response !== undefined) data.respondedBy = session?.user?.name || '';
    } else {
        // Chỉ cho sửa nếu đang là "Mới" và là chủ đề xuất
        if (existing.submittedBy !== session?.user?.email) {
            return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
        }
        if (existing.status !== 'Mới') {
            return NextResponse.json({ error: 'Không thể sửa sau khi đã được xem xét' }, { status: 400 });
        }
        if (body.title) data.title = body.title.trim();
        if (body.content !== undefined) data.content = body.content;
        if (body.type) data.type = body.type;
    }

    data.updatedAt = new Date();
    const updated = await prisma.proposal.update({ where: { id }, data });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const role = session?.user?.role || '';
    const isAdmin = BAN_GD.includes(role);

    const existing = await prisma.proposal.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    if (!isAdmin && existing.submittedBy !== session?.user?.email) {
        return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    await prisma.proposal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
