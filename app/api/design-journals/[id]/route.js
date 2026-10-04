import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { designJournalUpdateSchema } from '@/lib/validations/designJournal';
import { MANAGE_ROLES } from '@/lib/designTaskStatus';

// Sửa nhanh từng ô trên bảng Nhật ký TKKT.
export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.designJournal.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });

    const body = await request.json();
    const data = designJournalUpdateSchema.parse(body);
    if (data.content !== undefined && !data.content) {
        return NextResponse.json({ error: 'Nội dung công việc không được để trống' }, { status: 400 });
    }

    const journal = await prisma.designJournal.update({ where: { id }, data });
    return NextResponse.json(journal);
}, { roles: MANAGE_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.designJournal.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });

    await prisma.designJournal.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: MANAGE_ROLES });
