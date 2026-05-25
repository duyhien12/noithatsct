import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Phân quyền theo từng bước duyệt:
// approve_technical  → kỹ thuật + ban giám đốc
// approve_accounting → kế toán + ban giám đốc
// mark_paid          → chỉ ban giám đốc
// reject             → kế toán + ban giám đốc
const ACTION_ROLES = {
    approve_technical:  ['giam_doc', 'pho_gd', 'ban_gd', 'ky_thuat'],
    approve_accounting: ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt'],
    mark_paid:          ['giam_doc', 'pho_gd', 'ban_gd'],
    reject:             ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt'],
};

// PUT: Approve workflow steps
// pending_technical → pending_accounting → approved → paid
export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { action } = await request.json();

    // Kiểm tra action hợp lệ
    const allowedRoles = ACTION_ROLES[action];
    if (!allowedRoles) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    // Kiểm tra quyền theo từng action
    if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json(
            { error: 'Bạn không có quyền thực hiện thao tác này' },
            { status: 403 }
        );
    }

    const payment = await prisma.contractorPayment.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const transitions = {
        approve_technical:  { from: 'pending_technical',  to: 'pending_accounting' },
        approve_accounting: { from: 'pending_accounting', to: 'approved' },
        mark_paid:          { from: 'approved',           to: 'paid' },
        reject:             { from: null,                 to: 'rejected' },
    };

    const transition = transitions[action];

    if (action === 'reject') {
        if (payment.status === 'paid') return NextResponse.json({ error: 'Không thể từ chối phiếu đã thanh toán' }, { status: 400 });
    } else if (payment.status !== transition.from) {
        return NextResponse.json({ error: 'Trạng thái hiện tại không hợp lệ cho thao tác này' }, { status: 400 });
    }

    // approvedBy lấy từ session — không cho phép client tự khai
    const approvedBy = session.user.name;

    const data = { status: transition.to, approvedBy };
    if (action === 'approve_technical' || action === 'approve_accounting') {
        data.approvedAt = new Date();
    }
    if (action === 'mark_paid') {
        data.paidAmount = payment.contractAmount;
    }

    const updated = await prisma.contractorPayment.update({ where: { id }, data, include: { items: true } });
    return NextResponse.json(updated);
});
