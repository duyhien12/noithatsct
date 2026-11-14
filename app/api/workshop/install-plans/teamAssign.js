import prisma from '@/lib/prisma';
import { findTeamConflicts, sumMembers } from '@/lib/installTeams';

// Đọc danh sách teamIds từ body (nếu có). Trả undefined nếu body không gửi teamIds.
export function parseTeamIds(body) {
    if (body.teamIds === undefined) return undefined;
    if (!Array.isArray(body.teamIds)) return { error: 'Danh sách đội không hợp lệ' };
    const ids = [...new Set(body.teamIds.map(String).filter(Boolean))];
    if (ids.length > 20) return { error: 'Một đợt tối đa 20 đội' };
    return { ids };
}

// Nạp các đội đã chọn. Trả { teams } hoặc { error } (đội không tồn tại hoặc đã ngừng dùng).
export async function loadTeams(ids) {
    if (!ids.length) return { teams: [] };
    const teams = await prisma.installTeam.findMany({ where: { id: { in: ids } } });
    if (teams.length !== ids.length) return { error: 'Có đội không tồn tại' };
    const inactive = teams.find(t => !t.active);
    if (inactive) return { error: `Đội “${inactive.name}” đã ngừng hoạt động` };
    return { teams };
}

// Trả thông báo lỗi nếu một đội bị đặt trùng ngày với đợt khác đang còn việc. Không lỗi thì trả null.
export async function checkTeamConflicts({ teamIds, startDate, endDate, excludeId }) {
    if (!teamIds.length) return null;
    const plans = await prisma.installPlan.findMany({
        where: {
            ...(excludeId ? { id: { not: excludeId } } : {}),
            status: { not: 'Hoàn thành' },
            startDate: { lte: endDate },
            endDate: { gte: startDate },
            teams: { some: { teamId: { in: teamIds } } },
        },
        include: {
            customer: { select: { name: true } },
            teams: { select: { teamId: true, team: { select: { name: true } } } },
        },
    });
    const conflicts = findTeamConflicts({ teamIds, startDate, endDate, plans });
    if (!conflicts.length) return null;
    const first = conflicts[0];
    const who = first.plan.customer?.name || first.plan.customerName || first.plan.name;
    const fmt = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `Đội “${first.teamName}” đã có việc tại ${who} (${fmt(first.plan.startDate)} - ${fmt(first.plan.endDate)})`;
}

// Các trường ghi xuống InstallPlan cho phần đội: bảng nối và workerCount = tổng thành viên.
// Khi cập nhật (isUpdate) phải xóa bảng nối cũ trước; khi tạo mới thì không có gì để xóa.
export function teamWriteData(teamIds, teams, { isUpdate = false } = {}) {
    const create = teamIds.map(teamId => ({ teamId }));
    // Bỏ hết đội: chỉ xóa bảng nối, giữ nguyên số người đã ghi
    if (!teamIds.length) return { teams: { deleteMany: {} } };
    return {
        teams: isUpdate ? { deleteMany: {}, create } : { create },
        workerCount: sumMembers(teams),
    };
}
