import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseInstallTeam } from '@/lib/installTeams';

// Đội thi công: danh sách và tạo mới. Không xóa cứng — dùng active=false để ngừng dùng.
export const GET = withAuth(async () => {
    const teams = await prisma.installTeam.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
    return NextResponse.json(teams);
});

export const POST = withAuth(async (req) => {
    const { data, error } = parseInstallTeam(await req.json());
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!data.name) return NextResponse.json({ error: 'Nhập tên đội' }, { status: 400 });
    const last = await prisma.installTeam.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    const team = await prisma.installTeam.create({
        data: { kind: 'Lắp đặt', memberCount: 2, ...data, order: (last?.order ?? 0) + 1 },
    });
    return NextResponse.json(team, { status: 201 });
});
