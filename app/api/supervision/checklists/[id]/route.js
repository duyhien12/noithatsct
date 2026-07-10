import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const checklist = await prisma.supervisionChecklist.findFirst({
        where: { id, deletedAt: null },
        include: {
            project: { select: { id: true, code: true, name: true, address: true } },
            items: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        },
    });
    if (!checklist) return NextResponse.json({ error: 'Không tìm thấy checklist' }, { status: 404 });
    return NextResponse.json(checklist);
});

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { status, notes } = await request.json();

    const existing = await prisma.supervisionChecklist.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy checklist' }, { status: 404 });

    const updated = await prisma.supervisionChecklist.update({
        where: { id },
        data: {
            status: status || existing.status,
            notes: notes !== undefined ? notes : existing.notes,
            completedAt: status === 'Hoàn thành' && existing.status !== 'Hoàn thành' ? new Date() : existing.completedAt,
        },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.supervisionChecklist.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy checklist' }, { status: 404 });

    await prisma.supervisionChecklist.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
});
