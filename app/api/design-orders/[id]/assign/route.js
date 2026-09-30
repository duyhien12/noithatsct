import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { canAssignDesigner, ASSIGNABLE_STATUSES } from '@/lib/designOrderStatus';

const ASSIGN_ROLES = ['thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin'];

// Body: { designers: [{ userId, sharePercent }], confirmedDeadline }
export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    if (!canAssignDesigner(session.user.role)) {
        return NextResponse.json({ error: 'Bạn không có quyền phân công nhân sự thiết kế' }, { status: 403 });
    }

    const body = await request.json();
    const existing = await prisma.designOrder.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (!ASSIGNABLE_STATUSES.includes(existing.status)) {
        return NextResponse.json({ error: `Không thể phân công khi phiếu ở trạng thái "${existing.status}"` }, { status: 409 });
    }

    const input = Array.isArray(body.designers) ? body.designers : [];
    if (input.length === 0) {
        return NextResponse.json({ error: 'Chọn ít nhất 1 nhân sự thiết kế' }, { status: 400 });
    }
    const ids = input.map(d => d.userId);
    if (new Set(ids).size !== ids.length) {
        return NextResponse.json({ error: 'Một nhân viên bị chọn trùng' }, { status: 400 });
    }
    const shares = input.map(d => Number(d.sharePercent));
    if (shares.some(s => !Number.isFinite(s) || s <= 0)) {
        return NextResponse.json({ error: 'Tỷ lệ % của mỗi người phải lớn hơn 0' }, { status: 400 });
    }
    const totalShare = shares.reduce((a, b) => a + b, 0);
    if (Math.abs(totalShare - 100) >= 0.01) {
        return NextResponse.json({ error: `Tổng tỷ lệ chia doanh số phải bằng 100% (đang là ${totalShare}%)` }, { status: 400 });
    }

    const users = await prisma.user.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, name: true } });
    if (users.length !== ids.length) {
        return NextResponse.json({ error: 'Có nhân viên không tồn tại hoặc đã nghỉ' }, { status: 400 });
    }
    const nameOf = Object.fromEntries(users.map(u => [u.id, u.name]));
    const designers = input.map((d, i) => ({ userId: d.userId, userName: nameOf[d.userId], sharePercent: shares[i] }));
    const summary = designers.map(d => `${d.userName} ${d.sharePercent}%`).join(', ');

    const designOrder = await prisma.$transaction(async (tx) => {
        await tx.designOrderDesigner.deleteMany({ where: { designOrderId: id } });
        await tx.designOrderDesigner.createMany({
            data: designers.map(d => ({ designOrderId: id, ...d })),
        });
        await tx.designOrderLog.create({
            data: {
                designOrderId: id,
                fromStatus: existing.status,
                toStatus: existing.status,
                action: 'Phân công thiết kế',
                note: summary,
                userName: session.user.name,
            },
        });
        return tx.designOrder.update({
            where: { id },
            data: {
                // Giữ cột tên dạng chữ cho danh sách / bộ lọc cũ
                designerAssignee: designers.map(d => d.userName).join(', '),
                confirmedDeadline: body.confirmedDeadline ? new Date(body.confirmedDeadline) : null,
            },
        });
    });

    return NextResponse.json(designOrder);
}, { roles: ASSIGN_ROLES });
