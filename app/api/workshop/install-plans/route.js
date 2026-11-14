import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseInstallPlan } from './validate';
import { parseTeamIds, loadTeams, checkTeamConflicts, teamWriteData } from './teamAssign';

// Kế hoạch lắp đặt tại công trình — bảng InstallPlan riêng, không dính ScheduleTask
export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Khách trong danh sách đã bị xóa thì ẩn; kế hoạch ghi tên tự do (không có khách) vẫn hiện
    const where = { OR: [{ customerId: null }, { customer: { deletedAt: null } }] };
    if (customerId) where.customerId = customerId;
    // Lấy kế hoạch giao với khoảng [from, to)
    if (from) where.endDate = { gte: new Date(from) };
    if (to) where.startDate = { lt: new Date(to) };

    const plans = await prisma.installPlan.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { order: 'asc' }],
        include: {
            customer: { select: { id: true, code: true, name: true } },
            teams: { include: { team: { select: { id: true, name: true, kind: true, memberCount: true, active: true } } } },
        },
    });
    return NextResponse.json(plans);
});

export const POST = withAuth(async (req, context, session) => {
    const body = await req.json();
    const { data, error } = parseInstallPlan(body, { requireCustomer: true });
    if (error) return NextResponse.json({ error }, { status: 400 });

    const tp = parseTeamIds(body);
    if (tp?.error) return NextResponse.json({ error: tp.error }, { status: 400 });
    // Chưa có đội cũng được lưu: bộ xếp lịch sẽ gán đội
    const teamIds = tp?.ids ?? [];

    const { teams, error: teamErr } = await loadTeams(teamIds);
    if (teamErr) return NextResponse.json({ error: teamErr }, { status: 400 });
    const clash = await checkTeamConflicts({ teamIds, startDate: data.startDate, endDate: data.endDate });
    if (clash) return NextResponse.json({ error: clash }, { status: 409 });

    const last = await prisma.installPlan.findFirst({
        where: data.customerId ? { customerId: data.customerId } : { customerId: null, customerName: data.customerName },
        orderBy: { order: 'desc' },
        select: { order: true },
    });
    const plan = await prisma.installPlan.create({
        data: {
            ...data,
            ...(teamIds.length ? teamWriteData(teamIds, teams) : {}),
            order: (last?.order ?? 0) + 1,
            createdBy: session?.user?.name || '',
        },
    });
    return NextResponse.json(plan, { status: 201 });
});
