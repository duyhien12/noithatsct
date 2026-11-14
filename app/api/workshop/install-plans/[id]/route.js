import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseInstallPlan } from '../validate';
import { parseTeamIds, loadTeams, checkTeamConflicts, teamWriteData } from '../teamAssign';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const existing = await prisma.installPlan.findUnique({ where: { id }, include: { teams: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const body = await req.json();
    const { data, error } = parseInstallPlan(body);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const start = data.startDate || existing.startDate;
    const end = data.endDate || existing.endDate;
    if (end < start) return NextResponse.json({ error: 'Ngày kết thúc phải sau ngày bắt đầu' }, { status: 400 });

    // Không gửi teamIds (VD kéo thanh chỉ đổi ngày) thì giữ nguyên đội đang gán
    const tp = parseTeamIds(body);
    if (tp?.error) return NextResponse.json({ error: tp.error }, { status: 400 });

    let teamPart = {};
    let teamIds = existing.teams.map(t => t.teamId);
    if (tp) {
        const { teams, error: teamErr } = await loadTeams(tp.ids);
        if (teamErr) return NextResponse.json({ error: teamErr }, { status: 400 });
        teamIds = tp.ids;
        teamPart = teamWriteData(tp.ids, teams, { isUpdate: true });
    }

    const status = data.status || existing.status;
    if (status !== 'Hoàn thành') {
        const clash = await checkTeamConflicts({ teamIds, startDate: start, endDate: end, excludeId: id });
        if (clash) return NextResponse.json({ error: clash }, { status: 409 });
    }

    const plan = await prisma.installPlan.update({ where: { id }, data: { ...data, ...teamPart } });
    return NextResponse.json(plan);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.installPlan.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ success: true });
});
