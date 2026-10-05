import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { designWorkLogUpdateSchema } from '@/lib/validations/designWorkLog';
import { MANAGE_ROLES } from '@/lib/designTaskStatus';

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.designWorkLog.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });

    const data = designWorkLogUpdateSchema.parse(await request.json());
    const entry = await prisma.designWorkLog.update({ where: { id }, data });
    return NextResponse.json(entry);
}, { roles: MANAGE_ROLES });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.designWorkLog.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });

    await prisma.designWorkLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: MANAGE_ROLES });
