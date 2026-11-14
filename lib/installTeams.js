// Đội thi công cho kế hoạch lắp đặt. Dùng chung cho API (server) và trang Kế hoạch (client).

export const TEAM_KINDS = ['Lắp đặt', 'Xưởng'];

// Hai khoảng ngày (có cả ngày đầu và ngày cuối) có giao nhau không
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return new Date(aStart) <= new Date(bEnd) && new Date(bStart) <= new Date(aEnd);
}

// Trả { data } hoặc { error } cho đội thi công
export function parseInstallTeam(body = {}) {
    const data = {};
    if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return { error: 'Nhập tên đội' };
        if (name.length > 60) return { error: 'Tên đội tối đa 60 ký tự' };
        data.name = name;
    }
    if (body.kind !== undefined) {
        if (!TEAM_KINDS.includes(body.kind)) return { error: 'Loại đội không hợp lệ' };
        data.kind = body.kind;
    }
    if (body.memberCount !== undefined) {
        const n = Number(body.memberCount);
        if (!Number.isInteger(n) || n < 1 || n > 50) return { error: 'Số thành viên phải là số nguyên từ 1 đến 50' };
        data.memberCount = n;
    }
    if (body.active !== undefined) data.active = !!body.active;
    // Lịch làm việc và chuyên môn
    if (body.skills !== undefined) {
        const list = Array.isArray(body.skills) ? body.skills : String(body.skills || "").split(",");
        data.skills = list.map(x => String(x).trim()).filter(Boolean).join(",");
    }
    if (body.workWeekdays !== undefined) {
        const list = Array.isArray(body.workWeekdays) ? body.workWeekdays : String(body.workWeekdays || "").split(",");
        const days = [...new Set(list.map(Number))];
        if (days.some(n => !Number.isInteger(n) || n < 0 || n > 6)) return { error: "Ngày làm việc phải là 0 (CN) đến 6 (T7)" };
        data.workWeekdays = days.sort((a, b) => a - b).join(",");
    }
    if (body.offDates !== undefined) {
        const list = Array.isArray(body.offDates) ? body.offDates : String(body.offDates || "").split(",");
        const dates = list.map(x => String(x).trim()).filter(Boolean);
        if (dates.some(x => !/^\d{4}-\d{2}-\d{2}$/.test(x) || Number.isNaN(new Date(x).getTime()))) return { error: 'Ngày nghỉ phải có dạng YYYY-MM-DD' };
        data.offDates = [...new Set(dates)].sort().join(",");
    }
    if (body.memberIds !== undefined) {
        const list = Array.isArray(body.memberIds) ? body.memberIds : String(body.memberIds || "").split(",");
        data.memberIds = list.map(x => String(x).trim()).filter(Boolean).join(",");
    }
    if (body.allowPartial !== undefined) data.allowPartial = !!body.allowPartial;
    if (body.notes !== undefined) data.notes = String(body.notes);
    return { data };
}

// Danh sách đợt bị trùng lịch với đội, dạng [{ teamId, teamName, plan }].
// `plans` là các đợt đã nạp sẵn (có teams[].teamId, startDate, endDate), không gồm đợt đang sửa.
export function findTeamConflicts({ teamIds, startDate, endDate, plans }) {
    const out = [];
    for (const teamId of teamIds) {
        for (const plan of plans) {
            const team = plan.teams?.find(t => t.teamId === teamId);
            if (!team) continue;
            if (rangesOverlap(startDate, endDate, plan.startDate, plan.endDate)) {
                out.push({ teamId, teamName: team.team?.name || '', plan });
            }
        }
    }
    return out;
}

// Tổng thành viên của các đội được chọn
export function sumMembers(teams) {
    return teams.reduce((sum, t) => sum + (t.memberCount || 0), 0);
}
