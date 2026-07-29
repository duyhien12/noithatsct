import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { lessonLearnedStatusSchema } from '@/lib/validations/lessonLearned';
import { CREATE_ROLES, canTransitionStatus } from '@/lib/lessonLearned';

export const PATCH = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const existing = await prisma.lessonLearned.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bài học' }, { status: 404 });

    const { status } = lessonLearnedStatusSchema.parse(await request.json());

    if (!canTransitionStatus(session.user, existing.status, status)) {
        return NextResponse.json({ error: 'Bạn không có quyền chuyển trạng thái này' }, { status: 403 });
    }

    const history = Array.isArray(existing.history) ? existing.history : [];
    history.push({ at: new Date().toISOString(), by: session.user.name, action: `Chuyển trạng thái: ${existing.status} → ${status}` });

    const data = { status, history };
    if (!existing.confirmedBy && status !== 'Đang xử lý') {
        data.confirmedBy = session.user.name;
        data.confirmedAt = new Date();
    }

    const updated = await prisma.lessonLearned.update({ where: { id }, data });
    return NextResponse.json(updated);
}, { roles: CREATE_ROLES });
