import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { notifyWorkOrderAssigned } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.workOrder.findUnique({
        where: { id },
        include: { project: { select: { id: true, name: true, code: true } } },
    });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (!order.assignee) return NextResponse.json({ error: 'Phiếu chưa có người thực hiện' }, { status: 400 });

    const result = await notifyWorkOrderAssigned(order);
    if (result.success) return NextResponse.json({ success: true, message: 'Đã gửi Zalo thành công' });
    if (result.skipped) return NextResponse.json({ success: false, message: result.skipped }, { status: 422 });
    return NextResponse.json({ success: false, message: result.error || 'Gửi thất bại' }, { status: 500 });
});
