import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { verifySchedule } from '@/lib/schedule/engine';
import { planUpdatesFromResult } from '@/lib/schedule/mapping';
import { sumMembers } from '@/lib/installTeams';
import { APPROVE_ROLES } from '../../../shared';

// Chốt kế hoạch: ghi ngày và đội của từng công việc theo bản nháp. Từ chối nếu kế hoạch đã đổi sau khi tính.
export const POST = withAuth(async (req, { params }) => {
    const { id } = await params;
    const run = await prisma.scheduleRun.findUnique({ where: { id } });
    if (!run) return NextResponse.json({ error: 'Không tìm thấy bản tính lịch' }, { status: 404 });
    if (run.status !== 'draft') return NextResponse.json({ error: 'Chỉ chốt được bản nháp' }, { status: 409 });

    const input = JSON.parse(run.inputJson);
    const result = JSON.parse(run.resultJson);
    const check = verifySchedule(result, input);
    if (!check.ok) return NextResponse.json({ error: 'Bản nháp có vi phạm ràng buộc, không chốt', violations: check.violations.slice(0, 20) }, { status: 409 });

    const { updates, skipped } = planUpdatesFromResult(result);
    const planIds = updates.map(u => u.planId);
    const plans = await prisma.installPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, updatedAt: true, status: true } });
    const stale = plans.filter(p => p.updatedAt > run.createdAt || p.status === 'Hoàn thành');
    if (plans.length !== planIds.length || stale.length) {
        return NextResponse.json({ error: 'Kế hoạch đã thay đổi sau khi tính lịch. Hãy tính lại trước khi chốt.' }, { status: 409 });
    }

    const teamIds = [...new Set(updates.flatMap(u => u.teamIds))];
    const teamRows = await prisma.installTeam.findMany({ where: { id: { in: teamIds } } });
    if (teamRows.some(t => !t.active)) return NextResponse.json({ error: 'Có đội đã ngừng hoạt động. Hãy tính lại.' }, { status: 409 });
    const teamById = new Map(teamRows.map(t => [t.id, t]));

    const ops = updates.map(u => {
        const teams = u.teamIds.map(tid => teamById.get(tid)).filter(Boolean);
        return prisma.installPlan.update({
            where: { id: u.planId },
            data: {
                startDate: new Date(u.startDate),
                endDate: new Date(u.endDate),
                workerCount: teams.length ? sumMembers(teams) : undefined,
                teams: { deleteMany: {}, create: u.teamIds.map(teamId => ({ teamId })) },
            },
        });
    });
    ops.push(prisma.scheduleRun.updateMany({ where: { status: 'applied' }, data: { status: 'superseded' } }));
    ops.push(prisma.scheduleRun.update({ where: { id }, data: { status: 'applied', appliedAt: new Date() } }));
    await prisma.$transaction(ops);

    return NextResponse.json({ applied: updates.length, skipped });
}, { roles: APPROVE_ROLES });
