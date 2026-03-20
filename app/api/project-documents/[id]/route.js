import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { documentUpdateSchema } from '@/lib/validations/document';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const doc = await prisma.projectDocument.findUnique({
        where: { id },
        include: {
            folder: { select: { name: true } },
            _count: { select: { versions: true } },
        },
    });
    if (!doc) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(doc);
});

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const data = documentUpdateSchema.parse(body);

    const existing = await prisma.projectDocument.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Status change guards
    const lockedStatuses = ['Đã duyệt', 'Phát hành'];
    const adminRoles = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];
    const userRole = session?.user?.role || '';

    if (data.status && lockedStatuses.includes(existing.status) && !adminRoles.includes(userRole)) {
        return NextResponse.json({ error: 'Không có quyền thay đổi trạng thái tài liệu đã duyệt' }, { status: 403 });
    }

    // Prevent editing locked documents (except status change by admin)
    if (lockedStatuses.includes(existing.status) && !adminRoles.includes(userRole)) {
        // Allow only status change
        const nonStatusFields = Object.keys(data).filter(k => k !== 'status');
        if (nonStatusFields.length > 0) {
            return NextResponse.json({ error: 'Tài liệu đã duyệt/phát hành không thể chỉnh sửa' }, { status: 403 });
        }
    }

    const doc = await prisma.projectDocument.update({ where: { id }, data });
    return NextResponse.json(doc);
});

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;

    const existing = await prisma.projectDocument.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Block delete of approved/released docs for non-admin
    const lockedStatuses = ['Đã duyệt', 'Phát hành'];
    const adminRoles = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];
    if (lockedStatuses.includes(existing.status) && !adminRoles.includes(session?.user?.role || '')) {
        return NextResponse.json({ error: 'Không thể xóa tài liệu đã duyệt/phát hành' }, { status: 403 });
    }

    // Soft delete
    await prisma.projectDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
