import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { runSchedule, verifySchedule } from '@/lib/schedule/engine';
import { todayVN } from '@/lib/schedule/mapping';
import { buildScheduleInput, runSummary, SCHEDULE_ROLES } from '../shared';

export const GET = withAuth(async () => {
    const runs = await prisma.scheduleRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, kind: true, status: true, label: true, createdBy: true, summary: true, createdAt: true, appliedAt: true },
    });
    return NextResponse.json(runs.map(runSummary));
}, { roles: SCHEDULE_ROLES });

// Tính lịch mới thành bản nháp. 'auto' = xếp từ đầu; 'recalc' = tính lại theo khối lượng đã làm và khóa hiện tại.
// Cả hai dùng cùng bộ tính (xác định), khác nhau ở nhãn và ở dữ liệu thực tế người dùng đã cập nhật.
export const POST = withAuth(async (req, context, session) => {
    const body = await req.json().catch(() => ({}));
    const kind = body.kind === 'recalc' ? 'recalc' : 'auto';
    const input = await buildScheduleInput(todayVN());
    const result = runSchedule(input);
    const check = verifySchedule(result, input);
    if (!check.ok) {
        return NextResponse.json({
            error: 'Bộ xếp lịch phát hiện vi phạm ràng buộc nội bộ, không lưu bản nháp',
            violations: check.violations.slice(0, 20),
        }, { status: 500 });
    }
    const run = await prisma.scheduleRun.create({
        data: {
            kind,
            status: 'draft',
            label: String(body.label || (kind === 'recalc' ? 'Tính lại lịch' : 'Tự động xếp lịch')).slice(0, 80),
            createdBy: session?.user?.name || '',
            summary: JSON.stringify(result.summary),
            inputJson: JSON.stringify(input),
            resultJson: JSON.stringify(result),
        },
    });
    return NextResponse.json({ ...runSummary(run), result }, { status: 201 });
}, { roles: SCHEDULE_ROLES });
