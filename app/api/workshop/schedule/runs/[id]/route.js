import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { runSummary, SCHEDULE_ROLES } from '../../shared';

export const GET = withAuth(async (req, { params }) => {
    const { id } = await params;
    const run = await prisma.scheduleRun.findUnique({ where: { id } });
    if (!run) return NextResponse.json({ error: 'Không tìm thấy bản tính lịch' }, { status: 404 });
    return NextResponse.json({ ...runSummary(run), result: JSON.parse(run.resultJson || '{}'), input: JSON.parse(run.inputJson || '{}') });
}, { roles: SCHEDULE_ROLES });

// Chỉ xóa được bản nháp; bản đã chốt giữ làm lịch sử
export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    const run = await prisma.scheduleRun.findUnique({ where: { id } });
    if (!run) return NextResponse.json({ error: 'Không tìm thấy bản tính lịch' }, { status: 404 });
    if (run.status !== 'draft') return NextResponse.json({ error: 'Chỉ xóa được bản nháp' }, { status: 409 });
    await prisma.scheduleRun.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: SCHEDULE_ROLES });
