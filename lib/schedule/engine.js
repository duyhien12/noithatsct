// Bộ tính lịch thi công — thuần, xác định (cùng đầu vào luôn cho cùng kết quả), không gọi AI hay DB.
// Kết quả là lịch chính thức khi được người dùng chốt; AI (nếu có) chỉ dùng để giải thích, không quyết định lịch.
//
// Quy ước:
// - Ngày: chuỗi 'YYYY-MM-DD' hoặc Date (giờ UTC 0h). Khối lượng: giờ-người (person-hours).
// - Một đội làm theo ngày. Mặc định cả đội phải đủ người (allowPartial = false); thành viên không được
//   làm hai đội trong cùng một ngày.
// - Giờ thường: hoursPerDay/người/ngày. Tăng ca: tối đa otMaxPerDay/người/ngày, chỉ vào otWeekdays,
//   chỉ với công việc allowOvertime, và không vượt trần tháng/năm của từng người.
// - Một công việc dùng tối đa maxTeams đội cùng lúc. Thêm đội không tự động tăng sản lượng theo tỷ lệ:
//   chỉ khi maxTeams > 1 thì các đội mới được chia việc.
// - Đội đổi sang công trình khác phải di chuyển travelDays ngày trước khi làm.

const DAY_MS = 86400000;

export const dayOf = (x) => Math.round(new Date(x).getTime() / DAY_MS);
export const isoOf = (d) => new Date(d * DAY_MS).toISOString().slice(0, 10);
const weekdayOf = (d) => new Date(d * DAY_MS).getUTCDay();
const monthKey = (d) => isoOf(d).slice(0, 7);
const yearKey = (d) => isoOf(d).slice(0, 4);
const inRanges = (d, ranges) => ranges.some(([a, b]) => d >= a && d <= b);
const round = (x) => Math.round(x * 100) / 100;

export const DEFAULT_SETTINGS = {
    hoursPerDay: 8,
    otMaxPerDay: 3,
    otMaxPerMonth: 40,
    otMaxPerYear: 300,
    otWeekdays: [1, 2, 3, 4, 5, 6],
};

// Chuẩn hóa đội. Thành viên được nhận diện theo memberIds để phát hiện một người thuộc nhiều đội.
function normTeam(t, idx) {
    const members = t.memberIds?.length
        ? t.memberIds.map(String)
        : Array.from({ length: Math.max(1, t.memberCount ?? 2) }, (_, i) => `${t.id}#${i + 1}`);
    return {
        id: String(t.id),
        name: t.name || String(t.id),
        kind: t.kind || 'Lắp đặt',
        members,
        skills: new Set(t.skills || []),
        workWeekdays: new Set(t.workWeekdays ?? [1, 2, 3, 4, 5, 6]),
        offDays: new Set((t.offDates || []).map(dayOf)),
        busy: (t.busy || []).map(r => [dayOf(r.from), dayOf(r.to)]),
        allowPartial: !!t.allowPartial,
        order: t.order ?? idx,
    };
}

// Khối lượng ước tính khi chưa nhập: sức làm của tối đa `maxTeams` đội lớn nhất trong khung [from, to]
// (số người × giờ/ngày × ngày làm việc của đội, bỏ ngày nghỉ). Trả 0 nếu không có đội hoặc khung rỗng.
function windowCapacity(teams, hoursPerDay, maxTeams, from, to) {
    const pick = [...teams].sort((a, b) => b.members.length - a.members.length).slice(0, maxTeams);
    if (!pick.length || to < from) return 0;
    const perDay = pick.reduce((s, t) => s + t.members.length * hoursPerDay, 0);
    let days = 0;
    for (let d = from; d <= to; d++) {
        if (pick.some(t => t.workWeekdays.has(weekdayOf(d)) && !t.offDays.has(d))) days++;
    }
    return round(days * perDay);
}

// Tìm chu trình phụ thuộc (DFS). Trả về tập id nằm trên chu trình.
function findCycleNodes(jobs) {
    const graph = new Map(jobs.map(j => [j.id, j.deps.filter(d => jobs.some(x => x.id === d))]));
    const state = new Map();
    const bad = new Set();
    const stack = [];
    const visit = (id) => {
        state.set(id, 1);
        stack.push(id);
        for (const nx of graph.get(id) || []) {
            if (state.get(nx) === 1) {
                for (let i = stack.indexOf(nx); i < stack.length; i++) bad.add(stack[i]);
            } else if (!state.get(nx)) visit(nx);
        }
        stack.pop();
        state.set(id, 2);
    };
    for (const j of jobs) if (!state.get(j.id)) visit(j.id);
    return bad;
}

/**
 * @param {Object} input
 *  today, settings?, horizonEnd?,
 *  teams:    [{ id, name, kind, memberCount|memberIds, skills[], workWeekdays[], offDates[], busy[{from,to}], allowPartial, active }]
 *  people?:  [{ id, absentDates[], busy[{from,to}] }]
 *  projects?:[{ id, maxTeams }]          số đội tối đa làm đồng thời tại công trình
 *  jobs:     [{ id, name, projectId, projectName, priority, effortHours, doneHours?, remainingHours?,
 *               deadline, startNotBefore?, readyDate?, siteReadyDate?, skill, maxTeams, travelDays,
 *               allowOvertime, dependsOn[], locked, lockedTeamIds[], lockedStart, lockedEnd }]
 * @returns {{ jobs, segments, teams, issues, summary, horizon }}
 */
export function runSchedule(input) {
    const cfg = { ...DEFAULT_SETTINGS, ...(input.settings || {}) };
    const otWeekdays = new Set(cfg.otWeekdays);
    const issues = [];
    const today = dayOf(input.today);

    const teams = (input.teams || [])
        .filter(t => t.active !== false)
        .map(normTeam)
        .sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
    const teamById = new Map(teams.map(t => [t.id, t]));

    const people = new Map((input.people || []).map(p => [String(p.id), {
        absent: new Set((p.absentDates || []).map(dayOf)),
        busy: (p.busy || []).map(r => [dayOf(r.from), dayOf(r.to)]),
    }]));
    const memberFree = (pid, d) => {
        const p = people.get(pid);
        return !p || (!p.absent.has(d) && !inRanges(d, p.busy));
    };
    const projectCap = new Map((input.projects || []).map(p => [String(p.id), p.maxTeams ?? Infinity]));

    // ---- Chuẩn bị công việc ----
    const jobs = [];
    for (const raw of input.jobs || []) {
        const id = String(raw.id);
        let remaining = raw.remainingHours ?? (raw.effortHours != null ? raw.effortHours - (raw.doneHours || 0) : null);
        let effortEstimated = false;
        // Chưa có khối lượng nhưng có khung ngày: ước tính bằng sức làm của đội trong khung
        if (remaining == null && raw.deadline) {
            const from = Math.max(today, raw.startNotBefore ? dayOf(raw.startNotBefore) : today);
            const est = windowCapacity(teams, cfg.hoursPerDay, Math.max(1, raw.maxTeams ?? 1), from, dayOf(raw.deadline));
            if (est > 0) { remaining = est; effortEstimated = true; }
        }
        const missing = [];
        if (remaining == null || !(remaining >= 0)) {
            const pastWindow = raw.deadline && dayOf(raw.deadline) < today;
            missing.push(pastWindow
                ? `ngày kết thúc ${isoOf(dayOf(raw.deadline))} đã qua (hôm nay ${input.today}), cần cập nhật khung ngày hoặc nhập khối lượng`
                : 'thiếu khối lượng (giờ-người) hoặc khung ngày');
        }
        if (!raw.deadline) missing.push('thiếu hạn bàn giao');
        if (missing.length) {
            const label = [raw.projectName, raw.name].filter(Boolean).join(' · ') || id;
            issues.push({ type: 'MISSING_DATA', severity: 'error', jobId: id, message: `${label}: ${missing.join(', ')}` });
            continue;
        }
        const lock = raw.locked
            ? { teams: (raw.lockedTeamIds || []).map(String), start: Math.max(today, dayOf(raw.lockedStart)), end: dayOf(raw.lockedEnd) }
            : null;
        const startDay = Math.max(today, raw.startNotBefore ? dayOf(raw.startNotBefore) : today);
        jobs.push({
            id,
            name: raw.name || id,
            projectId: String(raw.projectId ?? ''),
            projectName: raw.projectName || '',
            priority: raw.priority ?? 3,
            effortEstimated,
            effort: effortEstimated ? Number(remaining) : Number(raw.effortHours ?? remaining),
            remaining: Number(remaining),
            initialRemaining: Number(remaining), // tổng khối lượng cần làm, dùng để chứng minh giới hạn
            deadline: dayOf(raw.deadline),
            startDay,
            matDay: raw.readyDate ? dayOf(raw.readyDate) : -Infinity,
            siteDay: raw.siteReadyDate ? dayOf(raw.siteReadyDate) : -Infinity,
            skill: raw.skill || '',
            maxTeams: Math.max(1, raw.maxTeams ?? 1),
            travelDays: raw.travelDays ?? 0,
            allowOT: !!raw.allowOvertime,
            deps: (raw.dependsOn || []).map(String),
            lock,
            // trạng thái mô phỏng
            finish: null,
            firstDay: null,
            remainingAtDeadline: null, // khối lượng còn thiếu cuối ngày hạn (để chẩn đoán việc trễ)
            otCapHit: false,           // đã cần tăng ca nhưng trần tháng/năm của người đã hết
            blocked: false,
            segments: [],
            teamIds: new Set(),
            explain: [],
            reasons: { waitStart: 0, waitMaterial: 0, waitSite: 0, waitDep: 0, noTeam: 0, noSkill: 0, travel: 0 },
            usedOT: false,
        });
        if (remaining === 0) jobs[jobs.length - 1].finish = today - 1;
        if (raw.deadline && dayOf(raw.deadline) < today) jobs[jobs.length - 1].remainingAtDeadline = remaining;
    }
    const byId = new Map(jobs.map(j => [j.id, j]));

    for (const j of findCycleNodes(jobs)) {
        const job = byId.get(j);
        job.blocked = true;
        issues.push({ type: 'CYCLE', severity: 'error', jobId: j, message: `${job.name}: phụ thuộc vòng tròn` });
    }

    // ---- Khóa phân công: đội bị giữ trong khoảng ngày, công việc khác không được dùng ----
    const reserved = new Map(); // `${day}|${teamId}` -> jobId
    for (const j of jobs.filter(x => x.lock)) {
        for (const tid of j.lock.teams) {
            if (!teamById.has(tid)) {
                issues.push({ type: 'MISSING_DATA', severity: 'error', jobId: j.id, teamId: tid, message: `${j.name}: đội khóa “${tid}” không còn hoạt động` });
                continue;
            }
            for (let d = j.lock.start; d <= j.lock.end; d++) {
                const key = `${d}|${tid}`;
                if (reserved.has(key) && reserved.get(key) !== j.id) {
                    issues.push({ type: 'LOCK_CONFLICT', severity: 'error', jobId: j.id, teamId: tid, date: isoOf(d),
                        message: `Đội ${teamById.get(tid).name} bị khóa trùng với công việc khác ngày ${isoOf(d)}` });
                } else reserved.set(key, j.id);
            }
        }
    }

    // ---- Khoảng mô phỏng ----
    const maxDeadline = Math.max(today, ...jobs.map(j => j.deadline));
    let hEnd = input.horizonEnd ? dayOf(input.horizonEnd) : Math.min(maxDeadline + 60, today + 730);
    for (const j of jobs) if (j.lock) hEnd = Math.max(hEnd, j.lock.end);
    hEnd = Math.min(hEnd, today + 730);

    // ---- Mô phỏng theo từng ngày ----
    const ts = new Map(teams.map(t => [t.id, { lastProject: null, blockedUntil: -Infinity, workedDays: 0, normalHours: 0, otHours: 0 }]));
    const monthOT = new Map(); // `${personId}|${month}` -> giờ tăng ca
    const yearOT = new Map();
    const otUsed = (m, d) => [monthOT.get(`${m}|${monthKey(d)}`) || 0, yearOT.get(`${m}|${yearKey(d)}`) || 0];
    const segments = [];
    const jobOrder = [...jobs].sort((a, b) =>
        (b.lock ? 1 : 0) - (a.lock ? 1 : 0) || a.priority - b.priority || a.deadline - b.deadline || a.id.localeCompare(b.id));
    const depsDone = (j, d) => j.deps.every(dep => {
        const dj = byId.get(dep);
        return !dj || (!dj.blocked && dj.finish !== null && dj.finish < d);
    });

    for (let d = today; d <= hEnd; d++) {
        if (jobs.every(j => j.finish !== null || j.blocked)) break;
        const wd = weekdayOf(d);
        const otAllowedDay = otWeekdays.has(wd);
        const usedMembers = new Set();
        const teamUsed = new Set();
        const projTeams = new Map();

        for (const j of jobOrder) {
            if (j.finish !== null || j.blocked) continue;
            if (j.lock) {
                if (d < j.lock.start || d > j.lock.end) continue;
            } else {
                if (d < j.startDay) { j.reasons.waitStart++; continue; }
                if (d < j.matDay) { j.reasons.waitMaterial++; continue; }
                if (d < j.siteDay) { j.reasons.waitSite++; continue; }
                if (!depsDone(j, d)) { j.reasons.waitDep++; continue; }
            }

            const pool = j.lock ? j.lock.teams.map(id => teamById.get(id)).filter(Boolean) : teams;
            const cands = [];
            for (const t of pool) {
                if (teamUsed.has(t.id)) continue;
                if (j.skill && !t.skills.has(j.skill)) continue;
                const r = reserved.get(`${d}|${t.id}`);
                if (r !== undefined && r !== j.id) continue;
                if (!t.workWeekdays.has(wd) || t.offDays.has(d) || inRanges(d, t.busy)) continue;
                const st = ts.get(t.id);
                if (d < st.blockedUntil) continue;
                const presentNow = () => t.members.filter(m => !usedMembers.has(m) && memberFree(m, d));
                const present = presentNow();
                if (present.length === 0) continue;
                if (present.length < t.members.length && !t.allowPartial) continue;
                const needTravel = j.travelDays > 0 && st.lastProject !== null && st.lastProject !== j.projectId;
                cands.push({ t, st, needTravel, presentNow });
            }
            // Ưu tiên đội đã làm công trình này (tránh luân phiên qua nhiều đội), rồi đến đội ít việc nhất
            cands.sort((a, b) => (a.needTravel - b.needTravel) || ((j.teamIds.has(a.t.id) ? 0 : 1) - (j.teamIds.has(b.t.id) ? 0 : 1)) || (a.st.workedDays - b.st.workedDays) || a.t.id.localeCompare(b.t.id));

            // Chọn đội: đúng chuyên môn trước, đủ người, không vượt số đội tối đa / trần công trình
            const cap = projectCap.get(j.projectId) ?? Infinity;
            const chosen = [];
            let projCount = projTeams.get(j.projectId) || 0;
            for (const c of cands) {
                if (chosen.length >= j.maxTeams || projCount >= cap) break;
                if (c.needTravel) continue;
                const present = c.presentNow(); // kiểm lại vì đội đã chọn trước có thể lấy người
                if (present.length === 0 || (present.length < c.t.members.length && !c.t.allowPartial)) continue;
                chosen.push({ ...c, present });
                projCount++;
            }

            if (!chosen.length) {
                const tr = cands.find(c => c.needTravel);
                if (tr) {
                    // Đội đi công trình mới: di chuyển trước, chưa làm việc hôm nay
                    tr.st.blockedUntil = d + j.travelDays;
                    tr.st.lastProject = j.projectId;
                    j.reasons.travel++;
                    j.explain.push(`${tr.t.name} di chuyển tới công trình ${j.projectName || j.projectId}, làm việc từ ${isoOf(d + j.travelDays)}`);
                } else if (pool.length && !pool.some(t => !j.skill || t.skills.has(j.skill))) {
                    j.reasons.noSkill++;
                } else {
                    j.reasons.noTeam++;
                }
                continue;
            }

            // Giờ thường
            const normalTotal = chosen.reduce((s, c) => s + c.present.length * cfg.hoursPerDay, 0);
            const memberTotal = chosen.reduce((s, c) => s + c.present.length, 0);
            let otTotal = 0;
            const needOT = j.allowOT && otAllowedDay && j.remaining > normalTotal * Math.max(1, j.deadline - d + 1);
            if (needOT) {
                // Trần tăng ca hôm nay của người ít hạn mức nhất trong các đội được chọn
                let capPerPerson = cfg.otMaxPerDay;
                for (const c of chosen) for (const m of c.present) {
                    const [mo, yr] = otUsed(m, d);
                    capPerPerson = Math.min(capPerPerson, cfg.otMaxPerMonth - mo, cfg.otMaxPerYear - yr);
                }
                capPerPerson = Math.max(0, capPerPerson);
                if (capPerPerson <= 0) j.otCapHit = true;
                const need = j.remaining - normalTotal;
                const perPerson = Math.min(capPerPerson, need / memberTotal);
                otTotal = Math.max(0, perPerson) * memberTotal;
            }
            const done = Math.min(j.remaining, normalTotal + otTotal);
            let normalLeft = Math.min(done, normalTotal);
            let otLeft = done - normalLeft;

            for (const c of chosen) {
                const teamNormalCap = c.present.length * cfg.hoursPerDay;
                const teamNormal = Math.min(teamNormalCap, normalLeft);
                normalLeft -= teamNormal;
                const teamOTCap = otTotal > 0 ? c.present.length * (otTotal / memberTotal) : 0;
                const teamOT = Math.min(teamOTCap, otLeft);
                otLeft -= teamOT;
                const perMemberOT = teamOT / c.present.length;

                for (const m of c.present) {
                    usedMembers.add(m);
                    if (perMemberOT > 0) {
                        const mk = `${m}|${monthKey(d)}`;
                        const yk = `${m}|${yearKey(d)}`;
                        monthOT.set(mk, (monthOT.get(mk) || 0) + perMemberOT);
                        yearOT.set(yk, (yearOT.get(yk) || 0) + perMemberOT);
                    }
                }
                teamUsed.add(c.t.id);
                const st = c.st;
                const firstTimeOnTeam = !j.teamIds.has(c.t.id);
                st.workedDays++;
                st.normalHours += teamNormal;
                st.otHours += teamOT;
                st.lastProject = j.projectId;
                j.teamIds.add(c.t.id);
                if (teamOT > 0) j.usedOT = true;
                if (firstTimeOnTeam) {
                    const sk = j.skill ? `đúng chuyên môn “${j.skill}”` : 'không yêu cầu chuyên môn';
                    const others = chosen.length > 1 ? ', chia việc cùng đội khác' : '';
                    j.explain.push(`${c.t.name} được chọn: ${sk}, rảnh ngày ${isoOf(d)}, đã làm ${st.workedDays - 1} ngày trước đó${others}`);
                }
                segments.push({
                    date: isoOf(d), teamId: c.t.id, jobId: j.id,
                    normalHours: round(teamNormal), otHours: round(teamOT), perMemberOT: round(perMemberOT),
                    members: [...c.present],
                });
                if (!j.firstDay && teamNormal + teamOT > 0) j.firstDay = d;
            }
            for (const c of chosen) projTeams.set(j.projectId, (projTeams.get(j.projectId) || 0) + 1);

            j.remaining = round(j.remaining - done);
            if (j.remaining <= 0) { j.remaining = 0; j.finish = d; }
        }
        // Ghi khối lượng còn thiếu cuối ngày hạn (kể cả khi công việc không được làm hôm đó)
        for (const j of jobs) {
            if (!j.lock && j.deadline === d && j.remainingAtDeadline === null) j.remainingAtDeadline = j.remaining;
        }
    }
    for (const j of jobs) {
        if (j.remainingAtDeadline === null) j.remainingAtDeadline = j.remaining;
    }

    // ---- Chẩn đoán ----
    const diagnose = (j) => {
        const pool = j.lock ? j.lock.teams.map(id => teamById.get(id)).filter(Boolean) : teams;
        const eligible = pool.filter(t => !j.skill || t.skills.has(j.skill));
        if (j.blocked) return { kind: 'BLOCKED', code: 'CYCLE', message: 'Phụ thuộc vòng tròn giữa các công việc', missingHours: j.remaining };
        if (eligible.length === 0) {
            return { kind: 'PROVEN_INFEASIBLE', code: 'NO_SKILL_TEAM', message: `Không có đội nào có chuyên môn “${j.skill}”`, missingHours: j.initialRemaining };
        }
        const effStart = Math.max(today, j.startDay, j.matDay, j.siteDay);
        const winEnd = j.lock ? j.lock.end : j.deadline;
        if (!j.lock && effStart > j.deadline) {
            return { kind: 'PROVEN_INFEASIBLE', code: 'READY_AFTER_DEADLINE', message: `Hàng/mặt bằng sẵn sàng ${isoOf(effStart)} sau hạn ${isoOf(j.deadline)}`, missingHours: j.initialRemaining };
        }
        // Cận trên năng lực trong [effStart, winEnd] với cấu hình hiện tại: mỗi ngày lấy maxTeams đội đông người nhất
        // đủ điều kiện; có thể cộng tăng ca nếu công việc cho phép. Bỏ qua trần tháng/năm và bận rộn nên đây là cận trên hợp lệ:
        // tổng khối lượng ban đầu vượt cận trên thì chắc chắn không có phương án.
        let normalCap = 0;
        let otCap = 0;
        for (let d = effStart; d <= winEnd; d++) {
            const wd = weekdayOf(d);
            const sizes = eligible
                .filter(t => t.workWeekdays.has(wd) && !t.offDays.has(d))
                .map(t => t.members.length)
                .sort((a, b) => b - a)
                .slice(0, j.maxTeams);
            const members = sizes.reduce((s, x) => s + x, 0);
            normalCap += members * cfg.hoursPerDay;
            if (j.allowOT && otWeekdays.has(wd)) otCap += members * cfg.otMaxPerDay;
        }
        const need = j.initialRemaining;
        if (need > normalCap + otCap) {
            const otNote = j.allowOT ? '' : ' (công việc không cho tăng ca)';
            return { kind: 'PROVEN_INFEASIBLE', code: 'CAPACITY_EXCEEDED',
                message: `Với cấu hình hiện tại${otNote}, khả năng tối đa từ ${isoOf(effStart)} đến ${isoOf(winEnd)} là ${round(normalCap + otCap)} giờ-người`,
                missingHours: round(need - normalCap - otCap) };
        }
        // Trong cận trên nhưng không kịp: cho biết còn thiếu bao nhiêu tới hạn
        const short = j.lock ? j.remaining : j.remainingAtDeadline;
        if (j.otCapHit) {
            return { kind: 'NOT_FOUND_WITH_CONFIG', code: 'OT_LIMIT_REACHED',
                message: 'Đã chạm trần tăng ca tháng/năm của thành viên trong đội. Lịch chưa tìm được phương án khác',
                missingHours: round(short) };
        }
        return { kind: 'NOT_FOUND_WITH_CONFIG', code: 'NO_FEASIBLE_PLAN',
            message: 'Không tìm được lịch đáp ứng với cấu hình hiện tại (chưa chứng minh được là không có phương án)',
            missingHours: round(short) };
    };

    const suggest = (j, diag) => {
        const out = [];
        if (!j.allowOT && (diag?.code === 'NEEDS_OVERTIME' || diag?.code === 'CAPACITY_EXCEEDED')) out.push('Cho phép tăng ca cho công việc này (trong trần giờ/ngày, tháng, năm)');
        if (diag?.code === 'NO_SKILL_TEAM') out.push(`Thêm đội có chuyên môn “${j.skill}” hoặc đổi chuyên môn yêu cầu`);
        if (j.maxTeams === 1 && (diag?.code === 'NEEDS_OVERTIME' || diag?.code === 'NO_FEASIBLE_PLAN' || diag?.code === 'CAPACITY_EXCEEDED')) {
            out.push('Cho phép chia việc cho tối đa 2 đội (nếu công việc có thể chia)');
        }
        if (diag?.code === 'CAPACITY_EXCEEDED' || diag?.code === 'NO_FEASIBLE_PLAN' || diag?.code === 'NEEDS_OVERTIME') {
            out.push(`Hoặc điều chỉnh hạn bàn giao (hiện ${isoOf(j.deadline)})`);
        }
        if (diag?.code === 'READY_AFTER_DEADLINE') out.push('Đẩy hạn bàn giao hoặc đẩy ngày hàng/mặt bằng sẵn sàng');
        if (diag?.code === 'OT_LIMIT_REACHED') out.push('Tăng trần tăng ca tháng/năm, hoặc thêm đội để chia việc');
        return out;
    };

    // ---- Kết quả theo công việc ----
    const outJobs = jobs.map(j => {
        const status = j.blocked ? 'blocked'
            : j.finish === null ? 'unfinished'
                : j.finish > j.deadline ? 'late' : 'on_time';
        const mine = segments.filter(s => s.jobId === j.id);
        const normalHours = round(mine.reduce((s, x) => s + x.normalHours, 0));
        const otHours = round(mine.reduce((s, x) => s + x.otHours, 0));
        const diag = status === 'on_time' ? null : diagnose(j);
        const reasons = j.reasons;
        const warn = [];
        if (reasons.waitMaterial) warn.push({ type: 'WAITING_MATERIAL', severity: 'warning', jobId: j.id, message: `${j.name}: chờ hàng đến ${isoOf(j.matDay)} (${reasons.waitMaterial} ngày)` });
        if (reasons.waitSite) warn.push({ type: 'WAITING_SITE', severity: 'warning', jobId: j.id, message: `${j.name}: chờ mặt bằng sẵn sàng ${isoOf(j.siteDay)}` });
        if (reasons.waitDep) warn.push({ type: 'WAITING_DEP', severity: 'info', jobId: j.id, message: `${j.name}: chờ công việc trước hoàn thành` });
        if (reasons.noSkill) warn.push({ type: 'NO_TEAM', severity: 'error', jobId: j.id, message: `${j.name}: không có đội đúng chuyên môn` });
        else if (reasons.noTeam) warn.push({ type: 'NO_TEAM', severity: 'warning', jobId: j.id, message: `${j.name}: thiếu đội rảnh (${reasons.noTeam} ngày)` });
        if (j.usedOT) warn.push({ type: 'OVERTIME_USED', severity: 'info', jobId: j.id, message: `${j.name}: có tăng ca để kịp hạn` });
        if (status === 'late') warn.push({ type: 'LATE_RISK', severity: 'error', jobId: j.id, message: `${j.name}: dự kiến trễ ${j.finish - j.deadline} ngày` });
        if (status === 'unfinished') warn.push({ type: 'LATE_RISK', severity: 'error', jobId: j.id, message: `${j.name}: chưa xếp xong trong khoảng xét, còn ${j.remaining} giờ-người` });
        if (diag?.kind === 'PROVEN_INFEASIBLE') warn.push({ type: 'PROVEN_INFEASIBLE', severity: 'error', jobId: j.id, message: `${j.name}: ${diag.message}` });
        issues.push(...warn);
        return {
            id: j.id,
            name: j.name,
            projectId: j.projectId,
            projectName: j.projectName,
            priority: j.priority,
            skill: j.skill,
            locked: !!j.lock,
            effortHours: j.effort,
            effortEstimated: !!j.effortEstimated,
            status,
            deadline: isoOf(j.deadline),
            plannedStart: j.firstDay !== null ? isoOf(j.firstDay) : null,
            plannedEnd: j.finish !== null ? isoOf(j.finish) : null,
            finishDay: j.finish,
            lateDays: j.finish !== null ? Math.max(0, j.finish - j.deadline) : null,
            remainingHours: j.remaining,
            normalHours,
            otHours,
            teamIds: [...j.teamIds],
            reasons,
            explain: j.explain,
            diagnosis: diag,
            suggestions: status === 'on_time' ? [] : suggest(j, diag),
        };
    });

    const outTeams = teams.map(t => {
        const st = ts.get(t.id);
        return { id: t.id, name: t.name, kind: t.kind, memberCount: t.members.length, workedDays: st.workedDays, normalHours: round(st.normalHours), otHours: round(st.otHours) };
    });

    const summary = {
        total: outJobs.length,
        onTime: outJobs.filter(j => j.status === 'on_time').length,
        late: outJobs.filter(j => j.status === 'late').length,
        unfinished: outJobs.filter(j => j.status === 'unfinished' || j.status === 'blocked').length,
        provenInfeasible: outJobs.filter(j => j.diagnosis?.kind === 'PROVEN_INFEASIBLE').length,
    };

    return {
        today: isoOf(today),
        horizon: { start: isoOf(today), end: isoOf(hEnd) },
        jobs: outJobs,
        segments,
        teams: outTeams,
        issues,
        summary,
    };
}

/**
 * Kiểm tra độc lập một kết quả có vi phạm ràng buộc không. Dùng trước khi chốt lịch và trong test.
 * Trả { ok, violations: [{ code, message }] }.
 */
export function verifySchedule(result, input) {
    const cfg = { ...DEFAULT_SETTINGS, ...(input.settings || {}) };
    const otWeekdays = new Set(cfg.otWeekdays);
    const v = [];
    const teams = new Map((input.teams || []).filter(t => t.active !== false).map(t => [String(t.id), normTeam(t, 0)]));
    const jobs = new Map((input.jobs || []).map(j => [String(j.id), j]));
    const resJobs = new Map(result.jobs.map(j => [j.id, j]));
    const projectCap = new Map((input.projects || []).map(p => [String(p.id), p.maxTeams ?? Infinity]));
    const personAbsent = new Map((input.people || []).map(p => [String(p.id), new Set((p.absentDates || []).map(dayOf))]));

    const teamDay = new Map();
    const personDay = new Map();
    const jobDayTeams = new Map();
    const projDayTeams = new Map();
    const monthPerson = new Map();
    const yearPerson = new Map();

    for (const s of result.segments) {
        const d = dayOf(s.date);
        const wd = weekdayOf(d);
        const t = teams.get(s.teamId);
        const j = jobs.get(s.jobId);
        const rj = resJobs.get(s.jobId);
        if (!t) { v.push({ code: 'UNKNOWN_TEAM', message: `Đội ${s.teamId} không tồn tại` }); continue; }
        if (!j) { v.push({ code: 'UNKNOWN_JOB', message: `Công việc ${s.jobId} không tồn tại` }); continue; }

        const tk = `${s.date}|${s.teamId}`;
        if (teamDay.has(tk) && teamDay.get(tk) !== s.jobId) v.push({ code: 'TEAM_DOUBLE_BOOKED', message: `Đội ${t.name} xếp 2 việc ngày ${s.date}` });
        teamDay.set(tk, s.jobId);

        if (!t.workWeekdays.has(wd) || t.offDays.has(d) || inRanges(d, t.busy)) {
            v.push({ code: 'TEAM_UNAVAILABLE', message: `Đội ${t.name} không làm việc ngày ${s.date}` });
        }
        for (const m of s.members) {
            const pk = `${s.date}|${m}`;
            if (personDay.has(pk) && personDay.get(pk) !== s.teamId) v.push({ code: 'PERSON_DOUBLE_BOOKED', message: `Thành viên ${m} thuộc 2 đội cùng ngày ${s.date}` });
            personDay.set(pk, s.teamId);
            if (personAbsent.get(m)?.has(d)) v.push({ code: 'PERSON_ABSENT', message: `Thành viên ${m} nghỉ ngày ${s.date}` });
            if (s.perMemberOT > cfg.otMaxPerDay + 1e-9) v.push({ code: 'OT_DAY_CAP', message: `${m} tăng ca quá ${cfg.otMaxPerDay} giờ ngày ${s.date}` });
            const mk = `${m}|${monthKey(d)}`;
            const yk = `${m}|${yearKey(d)}`;
            monthPerson.set(mk, (monthPerson.get(mk) || 0) + s.perMemberOT);
            yearPerson.set(yk, (yearPerson.get(yk) || 0) + s.perMemberOT);
        }
        if (s.otHours > 1e-9 && (!j.allowOvertime || !otWeekdays.has(wd))) {
            v.push({ code: 'OT_NOT_ALLOWED', message: `${j.name} tăng ca ngày ${s.date} không được phép` });
        }

        const jk = `${s.jobId}|${s.date}`;
        if (!jobDayTeams.has(jk)) jobDayTeams.set(jk, new Set());
        jobDayTeams.get(jk).add(s.teamId);
        if (j.projectId !== undefined) {
            const pk = `${j.projectId}|${s.date}`;
            if (!projDayTeams.has(pk)) projDayTeams.set(pk, new Set());
            projDayTeams.get(pk).add(s.teamId);
        }

        if (j.locked) {
            if (!(j.lockedTeamIds || []).map(String).includes(s.teamId)) v.push({ code: 'LOCK_VIOLATED', message: `${j.name} bị dùng đội ngoài phân công khóa` });
            if (d < dayOf(j.lockedStart) || d > dayOf(j.lockedEnd)) v.push({ code: 'LOCK_VIOLATED', message: `${j.name} làm ngoài khoảng khóa` });
        } else {
            const ready = Math.max(dayOf(input.today), j.startNotBefore ? dayOf(j.startNotBefore) : -Infinity, j.readyDate ? dayOf(j.readyDate) : -Infinity, j.siteReadyDate ? dayOf(j.siteReadyDate) : -Infinity);
            if (d < ready) v.push({ code: 'BEFORE_READY', message: `${j.name} làm trước khi sẵn sàng (${s.date})` });
        }
        if (rj && rj.finishDay !== null && d > rj.finishDay) v.push({ code: 'AFTER_FINISH', message: `${j.name} còn làm sau ngày hoàn thành` });
    }

    for (const [k, teamsSet] of jobDayTeams) {
        const j = jobs.get(k.split('|')[0]);
        if (j && teamsSet.size > (j.maxTeams ?? 1)) v.push({ code: 'JOB_CONCURRENCY', message: `${j.name} dùng ${teamsSet.size} đội cùng ngày, vượt ${j.maxTeams ?? 1}` });
    }
    for (const [k, teamsSet] of projDayTeams) {
        const cap = projectCap.get(k.split('|')[0]) ?? Infinity;
        if (teamsSet.size > cap) v.push({ code: 'PROJECT_CONCURRENCY', message: `Công trình ${k.split('|')[0]} có ${teamsSet.size} đội cùng ngày, vượt ${cap}` });
    }
    for (const [, hours] of monthPerson) if (hours > cfg.otMaxPerMonth + 1e-6) v.push({ code: 'OT_MONTH_CAP', message: `Tăng ca tháng vượt ${cfg.otMaxPerMonth} giờ/người` });
    for (const [, hours] of yearPerson) if (hours > cfg.otMaxPerYear + 1e-6) v.push({ code: 'OT_YEAR_CAP', message: `Tăng ca năm vượt ${cfg.otMaxPerYear} giờ/người` });

    for (const j of input.jobs || []) {
        const rj = resJobs.get(String(j.id));
        if (!rj || rj.finishDay === null) continue;
        for (const dep of j.dependsOn || []) {
            const dj = resJobs.get(String(dep));
            if (dj && dj.finishDay !== null && rj.plannedStart && dayOf(rj.plannedStart) <= dj.finishDay) {
                v.push({ code: 'DEPENDENCY', message: `${j.name} bắt đầu trước khi ${dj.name} xong` });
            }
        }
    }
    return { ok: v.length === 0, violations: v };
}
