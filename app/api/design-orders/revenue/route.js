import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const VIEW_ROLES = ['kinh_doanh', 'thiet_ke', 'ban_gd', 'giam_doc', 'pho_gd', 'admin', 'ke_toan', 'hanh_chinh_kt', 'viewer'];
const MONTH_RE = /^\d{4}-\d{2}$/;

// Doanh số thiết kế theo nhân viên, ghi nhận theo tháng KD nghiệm thu (revenueMonth).
// GET ?fromMonth=YYYY-MM&toMonth=YYYY-MM
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const fromMonth = searchParams.get('fromMonth');
    const toMonth = searchParams.get('toMonth');
    if (!MONTH_RE.test(fromMonth || '') || !MONTH_RE.test(toMonth || '')) {
        return NextResponse.json({ error: 'Tháng không hợp lệ (định dạng YYYY-MM)' }, { status: 400 });
    }

    const shares = await prisma.designOrderDesigner.findMany({
        where: {
            designOrder: { status: 'Hoàn thành', revenueMonth: { gte: fromMonth, lte: toMonth } },
        },
        include: {
            designOrder: {
                select: { id: true, code: true, customerName: true, siteAddress: true, revenueAmount: true, revenueMonth: true, acceptedAt: true, acceptedBy: true },
            },
        },
        orderBy: { designOrder: { acceptedAt: 'desc' } },
    });

    const byUser = new Map();
    for (const s of shares) {
        const row = byUser.get(s.userId) || { userId: s.userId, userName: s.userName, orderCount: 0, amount: 0, details: [] };
        row.orderCount += 1;
        row.amount += s.amount;
        row.details.push({
            designOrderId: s.designOrder.id,
            code: s.designOrder.code,
            customerName: s.designOrder.customerName,
            siteAddress: s.designOrder.siteAddress,
            revenueMonth: s.designOrder.revenueMonth,
            acceptedAt: s.designOrder.acceptedAt,
            acceptedBy: s.designOrder.acceptedBy,
            orderRevenue: s.designOrder.revenueAmount,
            sharePercent: s.sharePercent,
            amount: s.amount,
        });
        byUser.set(s.userId, row);
    }

    const rows = [...byUser.values()].sort((a, b) => b.amount - a.amount);
    const orderIds = new Set(shares.map(s => s.designOrder.id));
    const total = shares.reduce((sum, s) => sum + s.amount, 0);

    return NextResponse.json({ fromMonth, toMonth, rows, orderCount: orderIds.size, total });
}, { roles: VIEW_ROLES });
