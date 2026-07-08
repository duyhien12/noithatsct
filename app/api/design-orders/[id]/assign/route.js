import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { canAssignDesigner } from '@/lib/designOrderStatus';

const ASSIGN_ROLES = ['thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    if (!canAssignDesigner(session.user.role)) {
        return NextResponse.json({ error: 'Bạn không có quyền phân công nhân sự thiết kế' }, { status: 403 });
    }

    const body = await request.json();
    const existing = await prisma.designOrder.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    const designOrder = await prisma.designOrder.update({
        where: { id },
        data: {
            designerAssignee: body.designerAssignee ?? '',
            confirmedDeadline: body.confirmedDeadline ? new Date(body.confirmedDeadline) : null,
            designConfirmedBy: session.user.name,
            designConfirmedAt: new Date(),
        },
    });

    return NextResponse.json(designOrder);
}, { roles: ASSIGN_ROLES });
