import prisma from '@/lib/prisma';
import { toEngineTeams, toEngineJobs, toEngineSettings, todayVN } from '@/lib/schedule/mapping';

// Quản đốc (xuong) được tính và xem bản nháp; chỉ ban giám đốc được chốt kế hoạch.
export const SCHEDULE_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'xuong'];
export const APPROVE_ROLES = ['ban_gd', 'giam_doc', 'pho_gd'];

export async function getSettingsRow() {
    return prisma.scheduleSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
}

// Dữ liệu đầu vào hiện tại: đội đang hoạt động, công việc chưa xong, cấu hình giờ/tăng ca
export async function buildScheduleInput(today = todayVN()) {
    const [teamRows, planRows, settings] = await Promise.all([
        prisma.installTeam.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
        prisma.installPlan.findMany({
            where: { status: { not: 'Hoàn thành' }, OR: [{ customerId: null }, { customer: { deletedAt: null } }] },
            orderBy: [{ startDate: 'asc' }, { order: 'asc' }],
            include: { customer: { select: { name: true } }, teams: true },
        }),
        getSettingsRow(),
    ]);
    return {
        today,
        settings: toEngineSettings(settings),
        teams: toEngineTeams(teamRows),
        jobs: toEngineJobs(planRows),
    };
}

// Tóm tắt nhẹ để liệt kê các bản
export function runSummary(run) {
    let summary = {};
    try { summary = JSON.parse(run.summary || '{}'); } catch { /* bỏ qua */ }
    return {
        id: run.id,
        kind: run.kind,
        status: run.status,
        label: run.label,
        createdBy: run.createdBy,
        createdAt: run.createdAt,
        appliedAt: run.appliedAt,
        summary,
    };
}
