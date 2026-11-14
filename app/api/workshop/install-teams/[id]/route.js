import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseInstallTeam } from '@/lib/installTeams';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const existing = await prisma.installTeam.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy đội' }, { status: 404 });
    const { data, error } = parseInstallTeam(await req.json());
    if (error) return NextResponse.json({ error }, { status: 400 });
    const team = await prisma.installTeam.update({ where: { id }, data });
    // Đổi số thành viên thì tính lại số người của các đợt đang dùng đội này
    if (data.memberCount !== undefined && data.memberCount !== existing.memberCount) {
        const links = await prisma.installPlanTeam.findMany({ where: { teamId: id }, select: { planId: true } });
        for (const { planId } of links) {
            const teams = await prisma.installPlanTeam.findMany({
                where: { planId }, include: { team: { select: { memberCount: true } } },
            });
            const total = teams.reduce((sum, x) => sum + x.team.memberCount, 0);
            await prisma.installPlan.update({ where: { id: planId }, data: { workerCount: total } });
        }
    }
    return NextResponse.json(team);
});
