import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { lessonLearnedUpdateSchema } from '@/lib/validations/lessonLearned';
import { VIEW_ROLES, CREATE_ROLES, getLessonPermissions, canEditLesson } from '@/lib/lessonLearned';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const lesson = await prisma.lessonLearned.findUnique({
        where: { id },
        include: {
            project: { select: { name: true, code: true, address: true } },
            customer: { select: { name: true, code: true, phone: true } },
        },
    });
    if (!lesson) return NextResponse.json({ error: 'Không tìm thấy bài học' }, { status: 404 });
    return NextResponse.json(lesson);
}, { roles: VIEW_ROLES });

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.lessonLearned.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bài học' }, { status: 404 });

    if (!canEditLesson(session.user, existing)) {
        return NextResponse.json({ error: 'Bạn không có quyền sửa bài học này' }, { status: 403 });
    }

    const body = await request.json();
    const validated = lessonLearnedUpdateSchema.parse(body);
    // Trạng thái chỉ được đổi qua endpoint /status (đúng quy trình xác nhận), không qua form sửa nội dung.
    validated.status = existing.status;

    if (validated.projectId) {
        const project = await prisma.project.findUnique({ where: { id: validated.projectId }, select: { name: true } });
        if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
        if (!validated.projectName) validated.projectName = project.name;
    }
    if (validated.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: validated.customerId }, select: { name: true } });
        if (!customer) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
        if (!validated.customerName) validated.customerName = customer.name;
    }

    const history = Array.isArray(existing.history) ? existing.history : [];
    history.push({ at: new Date().toISOString(), by: session.user.name, action: 'Cập nhật nội dung' });

    const updated = await prisma.lessonLearned.update({
        where: { id },
        data: { ...validated, history },
    });

    return NextResponse.json(updated);
}, { roles: CREATE_ROLES });

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.lessonLearned.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bài học' }, { status: 404 });

    const perms = getLessonPermissions(session.user);
    if (!perms.canDelete) {
        return NextResponse.json({ error: 'Bạn không có quyền xóa bài học này' }, { status: 403 });
    }

    await prisma.lessonLearned.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: CREATE_ROLES });
