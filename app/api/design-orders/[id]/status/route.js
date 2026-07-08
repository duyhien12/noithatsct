import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { STATUSES, canTransition } from '@/lib/designOrderStatus';

const VIEW_ROLES = ['kinh_doanh', 'thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const status = body.status;

    if (!STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const existing = await prisma.designOrder.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    if (!canTransition(session.user.role, existing.status, status)) {
        return NextResponse.json({ error: `Không thể chuyển từ "${existing.status}" sang "${status}" với vai trò hiện tại` }, { status: 403 });
    }

    const data = { status };
    if (status === 'Đã gửi thiết kế') {
        data.salesApprovedBy = session.user.name;
        data.salesApprovedAt = new Date();
    }

    const designOrder = await prisma.designOrder.update({ where: { id }, data });
    return NextResponse.json(designOrder);
}, { roles: VIEW_ROLES });
