import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseInstallPlan } from '../validate';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const existing = await prisma.installPlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const { data, error } = parseInstallPlan(await req.json());
    if (error) return NextResponse.json({ error }, { status: 400 });
    const start = data.startDate || existing.startDate;
    const end = data.endDate || existing.endDate;
    if (end < start) return NextResponse.json({ error: 'Ngày kết thúc phải sau ngày bắt đầu' }, { status: 400 });

    const plan = await prisma.installPlan.update({ where: { id }, data });
    return NextResponse.json(plan);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.installPlan.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ success: true });
});
