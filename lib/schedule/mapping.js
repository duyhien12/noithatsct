// Chuyển đổi giữa bản ghi DB (InstallTeam, InstallPlan) và đầu vào/đầu ra của bộ xếp lịch (engine.js).
// Thuần: không gọi DB, để API và test dùng chung.

export const DEFAULT_WEEKDAYS = '1,2,3,4,5,6';

// "a, b,,c" → ['a','b','c']
export const splitList = (str) => String(str || '').split(',').map(x => x.trim()).filter(Boolean);
export const joinList = (arr) => (arr || []).map(x => String(x).trim()).filter(Boolean).join(',');

export const parseWeekdays = (str) => splitList(str || DEFAULT_WEEKDAYS).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);

// Ngày YYYY-MM-DD theo giờ Việt Nam (UTC+7), dùng làm "hôm nay" khi xếp lịch
export function todayVN(now = new Date()) {
    return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

// Date (lưu 0h UTC) → 'YYYY-MM-DD'
export const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// Danh sách đội trong DB → đội cho engine
export function toEngineTeams(rows) {
    return rows.map(t => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        // Có mã thành viên thì dùng để phát hiện người thuộc nhiều đội; không có thì coi như thành viên ẩn danh
        memberIds: splitList(t.memberIds),
        memberCount: t.memberCount,
        skills: splitList(t.skills),
        workWeekdays: parseWeekdays(t.workWeekdays),
        offDates: splitList(t.offDates),
        allowPartial: !!t.allowPartial,
        active: t.active,
        order: t.order,
    }));
}

// Công việc (InstallPlan, chưa hoàn thành) → việc cho engine. Thiếu khối lượng/hạn sẽ được engine báo MISSING_DATA.
export function toEngineJobs(plans) {
    return plans.map(p => ({
        id: p.id,
        name: p.name,
        projectId: p.customerId || `name:${p.customerName}`,
        projectName: p.customer?.name || p.customerName || '',
        priority: p.priority,
        effortHours: p.effortHours,
        doneHours: p.doneHours || 0,
        deadline: isoDate(p.deadline),
        startNotBefore: isoDate(p.startNotBefore),
        readyDate: isoDate(p.readyDate),
        siteReadyDate: isoDate(p.siteReadyDate),
        skill: p.skill,
        maxTeams: p.maxTeams,
        travelDays: p.travelDays,
        allowOvertime: p.allowOvertime,
        dependsOn: splitList(p.dependsOn),
        locked: p.locked,
        lockedTeamIds: (p.teams || []).map(x => x.teamId),
        lockedStart: isoDate(p.startDate),
        lockedEnd: isoDate(p.endDate),
    }));
}

// Cấu hình DB → cấu hình engine
export function toEngineSettings(row) {
    if (!row) return {};
    return {
        hoursPerDay: row.hoursPerDay,
        otMaxPerDay: row.otMaxPerDay,
        otMaxPerMonth: row.otMaxPerMonth,
        otMaxPerYear: row.otMaxPerYear,
        otWeekdays: parseWeekdays(row.otWeekdays),
    };
}

// Kết quả đã chốt → cập nhật cho từng công việc. Công việc khóa, chưa xong, hoặc không xếp được thì bỏ qua.
export function planUpdatesFromResult(result) {
    const updates = [];
    const skipped = [];
    for (const j of result.jobs) {
        if (j.locked) { skipped.push({ planId: j.id, reason: 'khóa phân công, giữ nguyên' }); continue; }
        if (!j.plannedStart || !j.plannedEnd) { skipped.push({ planId: j.id, reason: 'chưa xếp xong, giữ lịch cũ' }); continue; }
        updates.push({ planId: j.id, startDate: j.plannedStart, endDate: j.plannedEnd, teamIds: [...new Set(result.segments.filter(s => s.jobId === j.id).map(s => s.teamId))] });
    }
    return { updates, skipped };
}
