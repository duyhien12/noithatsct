import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { STATUSES, NOTE_REQUIRED, canTransition, transitionLabel, revenueMonthOf, splitRevenue } from '@/lib/designOrderStatus';

const VIEW_ROLES = ['kinh_doanh', 'thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin'];

const sharesValid = (designers) =>
    designers.length > 0 && Math.abs(designers.reduce((s, d) => s + d.sharePercent, 0) - 100) < 0.01;

export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const status = body.status;
    const note = (body.note || '').trim();

    if (!STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const existing = await prisma.designOrder.findUnique({
        where: { id },
        select: { status: true, totalAfterDiscount: true, designers: { orderBy: { userName: 'asc' } } },
    });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });

    const from = existing.status;
    if (!canTransition(session.user.role, from, status)) {
        return NextResponse.json({ error: `Không thể chuyển từ "${from}" sang "${status}" với vai trò hiện tại` }, { status: 403 });
    }
    if (NOTE_REQUIRED.has(`${from}>${status}`) && !note) {
        return NextResponse.json({ error: 'Vui lòng nhập lý do / ghi chú cho bước này' }, { status: 400 });
    }
    if ((status === 'Phòng thiết kế đã tiếp nhận' || status === 'Hoàn thành') && !sharesValid(existing.designers)) {
        return NextResponse.json({ error: 'Cần phân công nhân sự thiết kế và chia % doanh số đủ 100% trước bước này' }, { status: 400 });
    }

    const now = new Date();
    const userName = session.user.name;
    const data = { status };

    if (status === 'Đã gửi thiết kế') {
        data.salesApprovedBy = userName;
        data.salesApprovedAt = now;
    }
    if (status === 'Phòng thiết kế đã tiếp nhận') {
        data.designConfirmedBy = userName;
        data.designConfirmedAt = now;
    }
    if (status === 'Chờ nghiệm thu' && from === 'Đang thiết kế') {
        data.handedOverBy = userName;
        data.handedOverAt = now;
        data.handoverNote = note;
        if (Array.isArray(body.files)) data.handoverFiles = body.files;
    }

    const completing = status === 'Hoàn thành';
    const reopening = from === 'Hoàn thành';
    let splits = [];
    if (completing) {
        // Doanh số = tổng sau giảm giá, trước VAT; ghi nhận theo tháng nghiệm thu
        data.acceptedBy = userName;
        data.acceptedAt = now;
        data.revenueAmount = existing.totalAfterDiscount;
        data.revenueMonth = revenueMonthOf(now);
        splits = splitRevenue(existing.totalAfterDiscount, existing.designers);
    }
    if (reopening) {
        data.acceptedBy = '';
        data.acceptedAt = null;
        data.revenueAmount = 0;
        data.revenueMonth = '';
    }

    const designOrder = await prisma.$transaction(async (tx) => {
        // Chặn hai người bấm cùng lúc: chỉ cập nhật nếu trạng thái chưa bị đổi
        const { count } = await tx.designOrder.updateMany({ where: { id, status: from }, data });
        if (count === 0) return null;

        for (const d of splits) {
            await tx.designOrderDesigner.update({ where: { id: d.id }, data: { amount: d.amount } });
        }
        if (reopening) {
            await tx.designOrderDesigner.updateMany({ where: { designOrderId: id }, data: { amount: 0 } });
        }

        await tx.designOrderLog.create({
            data: {
                designOrderId: id,
                fromStatus: from,
                toStatus: status,
                action: transitionLabel(from, status),
                note,
                userName,
            },
        });

        return tx.designOrder.findUnique({ where: { id } });
    });

    if (!designOrder) {
        return NextResponse.json({ error: 'Phiếu vừa được người khác cập nhật, vui lòng tải lại' }, { status: 409 });
    }
    return NextResponse.json(designOrder);
}, { roles: VIEW_ROLES });
