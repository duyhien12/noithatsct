import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getIssuePermissions } from '@/lib/customerIssue/permissions';
import { fail, loadActor } from '@/lib/customerIssue/service';

const LIMIT = 20;

// GET /api/customer-issues/lookups?type=customers|projects|users|workOrders
// Danh sách chọn cho form Đồng hành 360 — chỉ trả các trường cần hiển thị.
//   customers  ?search=
//   projects   ?customerId=&search=
//   users      ?search=            (tài khoản đang hoạt động)
//   workOrders ?projectId=         (phiếu cùng dự án, chưa liên kết vấn đề nào)
export const GET = withAuth(async (request, _ctx, session) => {
    const actor = await loadActor(session);
    if (!getIssuePermissions(actor).view) return fail('Bạn không có quyền truy cập', 403);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.trim() || '';
    const like = (field) => ({ [field]: { contains: search, mode: 'insensitive' } });

    if (type === 'customers') {
        const data = await prisma.customer.findMany({
            where: search ? { OR: [like('name'), like('code'), { phone: { contains: search } }] } : {},
            select: { id: true, code: true, name: true, phone: true },
            orderBy: { updatedAt: 'desc' },
            take: LIMIT,
        });
        return NextResponse.json({ data });
    }

    if (type === 'projects') {
        const customerId = searchParams.get('customerId');
        const data = await prisma.project.findMany({
            where: {
                ...(customerId && { customerId }),
                ...(search && { OR: [like('name'), like('code')] }),
            },
            select: { id: true, code: true, name: true, customerId: true, customer: { select: { id: true, code: true, name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: LIMIT,
        });
        return NextResponse.json({ data });
    }

    if (type === 'users') {
        const data = await prisma.user.findMany({
            where: { active: true, ...(search && like('name')) },
            select: { id: true, name: true, role: true, department: true },
            orderBy: { name: 'asc' },
            take: search ? LIMIT : 200,
        });
        return NextResponse.json({ data });
    }

    if (type === 'workOrders') {
        const projectId = searchParams.get('projectId');
        if (!projectId) return fail('Thiếu dự án');
        const data = await prisma.workOrder.findMany({
            where: { projectId, customerIssueId: null, ...(search && { OR: [like('title'), like('code')] }) },
            select: { id: true, code: true, title: true, status: true, assignee: true, dueDate: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return NextResponse.json({ data });
    }

    return fail('Loại danh sách không hợp lệ');
});
