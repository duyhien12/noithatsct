import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Chỉ ban quản lý và kế toán mới được sửa/xoá nhật ký dự án
const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt'];
const MANAGEMENT_ROLES = ['giam_doc', 'pho_gd', 'ban_gd'];

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const { aiSummary } = body;
    const data = {};
    if (aiSummary !== undefined) data.aiSummary = aiSummary;
    // createdBy lấy từ session để tránh giả mạo
    data.createdBy = session.user.name;

    const entry = await prisma.journalEntry.update({
        where: { id },
        data,
        include: { commitments: true },
    });
    return NextResponse.json(entry);
}, { roles: FINANCE_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.journalEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: MANAGEMENT_ROLES });
