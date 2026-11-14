import { describe, it, expect } from 'vitest';
import { runSchedule, verifySchedule } from '@/lib/schedule/engine';

// Hôm nay = Thứ Hai 16/11/2026 (Thứ Bảy là ngày tăng ca được phép; Chủ nhật thì không)
const TODAY = '2026-11-16';

const teamsAll = () => [
    { id: 'T1', name: 'Đội 1', memberIds: ['P1', 'P2'], skills: ['tu_bep'], order: 1 },
    { id: 'T2', name: 'Đội 2', memberIds: ['P3', 'P4'], skills: ['tu_ao', 'op_vach'], order: 2 },
    { id: 'T3', name: 'Đội 3', memberIds: ['P5', 'P6'], skills: ['tu_bep', 'tu_ao'], order: 3 },
    { id: 'T4', name: 'Đội 4 (xưởng)', kind: 'Xưởng', memberIds: ['P7', 'P8'], skills: [], order: 4 },
];

// Đầu vào mặc định: 4 đội, 2 người mỗi đội, giờ thường 8h/người/ngày
const input = (over: Record<string, any> = {}) => ({
    today: TODAY,
    teams: teamsAll(),
    people: [],
    projects: [],
    jobs: [],
    ...over,
});

const job = (id: string, extra: Record<string, any> = {}) => ({
    id,
    name: `Việc ${id}`,
    projectId: 'KH1',
    projectName: 'Công trình 1',
    effortHours: 32,
    deadline: '2026-11-30',
    skill: '',
    maxTeams: 1,
    allowOvertime: false,
    dependsOn: [],
    ...extra,
});

const run = (inp: any) => {
    const result = runSchedule(inp);
    const check = verifySchedule(result, inp);
    return { result, check };
};
const byId = (result: any, id: string) => result.jobs.find((j: any) => j.id === id);

describe('lịch đủ năng lực', () => {
    it('hoàn thành bằng giờ thường, không tăng ca', () => {
        // 1 đội 2 người × 8h = 16 giờ-người/ngày; 32 giờ-người = 2 ngày
        const { result, check } = run(input({ teams: [teamsAll()[0]], jobs: [job('A')] }));
        const a = byId(result, 'A');
        expect(a.status).toBe('on_time');
        expect(a.plannedStart).toBe('2026-11-16');
        expect(a.plannedEnd).toBe('2026-11-17');
        expect(a.otHours).toBe(0);
        expect(check.violations).toEqual([]);
    });
});

describe('tăng ca', () => {
    it('cần tăng ca mới kịp hạn: dùng tăng ca trong trần 3h/người/ngày', () => {
        // 60 giờ-người, hạn Thứ Tư 18/11 (hôm nay Thứ Hai): giờ thường 48 < 60, tăng ca 3 ngày × 6 = 18 → đủ
        const { result, check } = run(input({
            teams: [teamsAll()[0]],
            jobs: [job('A', { effortHours: 60, deadline: '2026-11-18', allowOvertime: true })],
        }));
        const a = byId(result, 'A');
        expect(a.status).toBe('on_time');
        expect(a.otHours).toBeGreaterThan(0);
        expect(a.normalHours + a.otHours).toBeCloseTo(60, 5);
        expect(result.issues.some((i: any) => i.type === 'OVERTIME_USED' && i.jobId === 'A')).toBe(true);
        expect(check.violations).toEqual([]);
    });

    it('không cho phép tăng ca thì không tự ý tăng ca', () => {
        const { result, check } = run(input({
            teams: [teamsAll()[0]],
            jobs: [job('A', { effortHours: 60, deadline: '2026-11-17', allowOvertime: false })],
        }));
        expect(byId(result, 'A').otHours).toBe(0);
        expect(check.violations).toEqual([]);
    });

    it('tăng ca vẫn thiếu năng lực: chứng minh không khả thi và nêu số giờ còn thiếu', () => {
        // 80 giờ-người, hạn Thứ Tư 18/11: cận trên 3 ngày = giờ thường 48 + tăng ca 18 = 66 → thiếu 14
        const { result, check } = run(input({
            teams: [teamsAll()[0]],
            jobs: [job('A', { effortHours: 80, deadline: '2026-11-18', allowOvertime: true })],
        }));
        const a = byId(result, 'A');
        expect(a.status).toBe('late');
        expect(a.diagnosis.kind).toBe('PROVEN_INFEASIBLE');
        expect(a.diagnosis.code).toBe('CAPACITY_EXCEEDED');
        // Thứ 2–4: giờ thường 16×3=48, tăng ca 6×3=18 → tối đa 66; còn thiếu 14
        expect(a.diagnosis.missingHours).toBe(14);
        expect(a.suggestions.length).toBeGreaterThan(0);
        expect(check.violations).toEqual([]);
    });

    it('trần tăng ca tháng đã hết thì báo rõ là chạm trần, không kết luận là vô phương án', () => {
        const { result } = run(input({
            settings: { otMaxPerMonth: 3 },
            teams: [teamsAll()[0]],
            jobs: [job('A', { effortHours: 60, deadline: '2026-11-18', allowOvertime: true })],
        }));
        const a = byId(result, 'A');
        expect(a.status).toBe('late');
        expect(a.diagnosis.code).toBe('OT_LIMIT_REACHED');
    });
});

describe('không tự động thêm người để tăng sản lượng', () => {
    it('một đội chỉ làm một việc; chia việc cho 2 đội chỉ khi công việc cho phép', () => {
        // 64 giờ-người trong 2 ngày: 1 đội (32/ngày cả hai ngày = 32) không đủ
        const oneTeam = run(input({ jobs: [job('A', { effortHours: 64, deadline: '2026-11-17', maxTeams: 1 })] }));
        const a1 = byId(oneTeam.result, 'A');
        expect(a1.status).not.toBe('on_time');
        expect(a1.diagnosis.code).toBe('CAPACITY_EXCEEDED');
        expect(oneTeam.check.violations).toEqual([]);

        const twoTeams = run(input({ jobs: [job('A', { effortHours: 64, deadline: '2026-11-17', maxTeams: 2 })] }));
        const a2 = byId(twoTeams.result, 'A');
        expect(a2.status).toBe('on_time');
        // Đồng thời tối đa 2 đội mỗi ngày (không quá maxTeams)
        const perDay = new Map<string, Set<string>>();
        for (const s of twoTeams.result.segments) {
            if (!perDay.has(s.date)) perDay.set(s.date, new Set());
            perDay.get(s.date)!.add(s.teamId);
        }
        expect(Math.max(...[...perDay.values()].map(x => x.size))).toBe(2);
        expect(twoTeams.check.violations).toEqual([]);
    });
});

describe('nhân sự và đội', () => {
    it('người nghỉ làm cả đội nghỉ (không cho phép làm thiếu người)', () => {
        const { result, check } = run(input({
            teams: [teamsAll()[0]],
            people: [{ id: 'P1', absentDates: ['2026-11-16'] }],
            jobs: [job('A', { effortHours: 16, deadline: '2026-11-30' })],
        }));
        expect(byId(result, 'A').plannedStart).toBe('2026-11-17');
        expect(check.violations).toEqual([]);
    });

    it('cho phép làm thiếu người thì đội vẫn làm với người có mặt', () => {
        const { result, check } = run(input({
            teams: [{ ...teamsAll()[0], allowPartial: true }],
            people: [{ id: 'P1', absentDates: ['2026-11-16'] }],
            jobs: [job('A', { effortHours: 16, deadline: '2026-11-30' })],
        }));
        expect(byId(result, 'A').plannedStart).toBe('2026-11-16');
        expect(check.violations).toEqual([]);
    });

    it('một người thuộc hai đội không được xếp trùng ngày', () => {
        // P2 nằm trong cả hai đội; hai việc cùng ngày chỉ một đội được làm
        const teams = [
            { id: 'TA', name: 'Đội A', memberIds: ['P1', 'P2'] },
            { id: 'TB', name: 'Đội B', memberIds: ['P2', 'P3'] },
        ];
        const { result, check } = run(input({
            teams,
            jobs: [job('A', { effortHours: 16, deadline: '2026-11-30' }), job('B', { effortHours: 16, deadline: '2026-11-30' })],
        }));
        expect(byId(result, 'A').plannedStart).toBe('2026-11-16');
        expect(byId(result, 'B').plannedStart).toBe('2026-11-17');
        expect(check.violations).toEqual([]);
    });

    it('không có đội đúng chuyên môn thì báo chắc chắn không khả thi', () => {
        const { result } = run(input({ jobs: [job('A', { skill: 'tu_cong' })] }));
        const a = byId(result, 'A');
        expect(a.status).toBe('unfinished');
        expect(a.diagnosis.kind).toBe('PROVEN_INFEASIBLE');
        expect(a.diagnosis.code).toBe('NO_SKILL_TEAM');
        expect(result.summary.provenInfeasible).toBe(1);
    });
});

describe('ràng buộc lịch', () => {
    it('chờ hàng: không xếp trước ngày hàng sẵn sàng', () => {
        const { result, check } = run(input({
            teams: [teamsAll()[0]],
            jobs: [job('A', { effortHours: 16, readyDate: '2026-11-19' })],
        }));
        const a = byId(result, 'A');
        expect(a.plannedStart).toBe('2026-11-19');
        expect(a.reasons.waitMaterial).toBe(3);
        expect(result.issues.some((i: any) => i.type === 'WAITING_MATERIAL' && i.jobId === 'A')).toBe(true);
        expect(check.violations).toEqual([]);
    });

    it('chờ mặt bằng sẵn sàng', () => {
        const { result } = run(input({
            teams: [teamsAll()[0]],
            jobs: [job('A', { effortHours: 16, siteReadyDate: '2026-11-18' })],
        }));
        expect(byId(result, 'A').plannedStart).toBe('2026-11-18');
        expect(result.issues.some((i: any) => i.type === 'WAITING_SITE')).toBe(true);
    });

    it('công việc phụ thuộc chỉ bắt đầu sau khi việc trước xong', () => {
        const { result, check } = run(input({
            teams: [teamsAll()[0], teamsAll()[1]],
            jobs: [
                job('A', { effortHours: 16, deadline: '2026-11-30' }),
                job('B', { effortHours: 16, deadline: '2026-11-30', dependsOn: ['A'] }),
            ],
        }));
        expect(byId(result, 'A').plannedEnd).toBe('2026-11-16');
        expect(byId(result, 'B').plannedStart).toBe('2026-11-17');
        expect(check.violations).toEqual([]);
    });

    it('việc phụ thuộc vòng tròn bị đánh dấu chặn', () => {
        const { result } = run(input({
            jobs: [job('A', { dependsOn: ['B'] }), job('B', { dependsOn: ['A'] })],
        }));
        expect(byId(result, 'A').status).toBe('blocked');
        expect(byId(result, 'B').status).toBe('blocked');
        expect(result.issues.some((i: any) => i.type === 'CYCLE')).toBe(true);
    });

    it('chuyển công trình phải di chuyển trước khi làm việc', () => {
        // Đội làm A ở KH1 rồi chuyển sang B ở KH2 với 1 ngày di chuyển
        const { result, check } = run(input({
            teams: [teamsAll()[0]],
            jobs: [
                job('A', { effortHours: 16, projectId: 'KH1', deadline: '2026-11-30' }),
                job('B', { effortHours: 16, projectId: 'KH2', travelDays: 1, deadline: '2026-11-30', startNotBefore: '2026-11-16' }),
            ],
        }));
        const a = byId(result, 'A');
        const b = byId(result, 'B');
        expect(a.plannedEnd).toBe('2026-11-16');
        expect(b.reasons.travel).toBeGreaterThan(0);
        expect(b.plannedStart).not.toBe('2026-11-17');
        expect(check.violations).toEqual([]);
    });

    it('giới hạn số đội đồng thời của công trình', () => {
        const { result, check } = run(input({
            projects: [{ id: 'KH1', maxTeams: 1 }],
            jobs: [
                job('A', { effortHours: 16, projectId: 'KH1', deadline: '2026-11-30' }),
                job('B', { effortHours: 16, projectId: 'KH1', deadline: '2026-11-30' }),
            ],
        }));
        // Công trình chỉ được 1 đội cùng lúc: B phải chờ A xong (hoặc đi cùng ngày với đội khác bị chặn)
        const sameDayTeams = new Set(result.segments.filter((s: any) => s.date === '2026-11-16').map((s: any) => s.teamId));
        expect(sameDayTeams.size).toBe(1);
        expect(check.violations).toEqual([]);
    });
});

describe('khóa phân công', () => {
    it('việc đã khóa giữ nguyên đội; việc khác không dùng đội bị khóa trong khoảng khóa', () => {
        const { result, check } = run(input({
            teams: [teamsAll()[0], teamsAll()[2]], // T1 và T3 cùng làm được tủ bếp
            jobs: [
                job('L', { skill: 'tu_bep', effortHours: 16, deadline: '2026-11-20', locked: true,
                    lockedTeamIds: ['T1'], lockedStart: '2026-11-16', lockedEnd: '2026-11-20' }),
                job('X', { skill: 'tu_bep', effortHours: 16, deadline: '2026-11-30' }),
            ],
        }));
        expect(byId(result, 'L').teamIds).toEqual(['T1']);
        expect(byId(result, 'X').teamIds).toEqual(['T3']);
        expect(check.violations).toEqual([]);
    });

    it('hai việc khóa cùng đội cùng ngày bị báo xung đột ngay', () => {
        const { result } = run(input({
            jobs: [
                job('L1', { effortHours: 16, deadline: '2026-11-20', locked: true, lockedTeamIds: ['T1'], lockedStart: '2026-11-16', lockedEnd: '2026-11-18' }),
                job('L2', { effortHours: 16, deadline: '2026-11-20', locked: true, lockedTeamIds: ['T1'], lockedStart: '2026-11-17', lockedEnd: '2026-11-19' }),
            ],
        }));
        expect(result.issues.some((i: any) => i.type === 'LOCK_CONFLICT')).toBe(true);
    });
});

describe('dữ liệu thiếu và cập nhật thực tế', () => {
    it('việc thiếu hạn hoặc khối lượng không được xếp và được báo', () => {
        const { result } = run(input({
            jobs: [job('A', { deadline: undefined }), job('B', { effortHours: undefined })],
        }));
        expect(result.jobs.length).toBe(0);
        expect(result.issues.filter((i: any) => i.type === 'MISSING_DATA').length).toBe(2);
    });

    it('tính lại theo khối lượng còn lại (không theo phần trăm)', () => {
        // Đã làm 40 giờ-người trên tổng 60 → còn 20 → 2 ngày với 1 đội
        const { result, check } = run(input({
            teams: [teamsAll()[0]],
            jobs: [job('A', { effortHours: 60, doneHours: 40, deadline: '2026-11-30' })],
        }));
        const total = result.segments.reduce((s: number, x: any) => s + x.normalHours + x.otHours, 0);
        expect(Math.round(total)).toBe(20);
        expect(byId(result, 'A').plannedEnd).toBe('2026-11-17');
        expect(check.violations).toEqual([]);
    });
});

describe('minh họa: 4 công trình, 4 đội, mỗi đội 2 người', () => {
    const demo = () => input({
        projects: [
            { id: 'KH1', maxTeams: 2 }, { id: 'KH2', maxTeams: 2 },
            { id: 'KH3', maxTeams: 1 }, { id: 'KH4', maxTeams: 1 },
        ],
        jobs: [
            job('KH1-BEP', { projectId: 'KH1', projectName: 'Công trình 1', skill: 'tu_bep', effortHours: 48, deadline: '2026-11-25', priority: 1 }),
            job('KH1-AO', { projectId: 'KH1', projectName: 'Công trình 1', skill: 'tu_ao', effortHours: 32, deadline: '2026-11-27', dependsOn: ['KH1-BEP'] }),
            job('KH2-VACH', { projectId: 'KH2', projectName: 'Công trình 2', skill: 'op_vach', effortHours: 40, deadline: '2026-11-24', priority: 2 }),
            job('KH3-BEP', { projectId: 'KH3', projectName: 'Công trình 3', skill: 'tu_bep', effortHours: 30, deadline: '2026-11-22', readyDate: '2026-11-18', allowOvertime: true, priority: 1 }),
            job('KH4-LAP', { projectId: 'KH4', projectName: 'Công trình 4', effortHours: 16, deadline: '2026-12-05', priority: 3 }),
        ],
    });

    it('lịch hợp lệ, mọi việc được xếp hoặc có chẩn đoán rõ ràng', () => {
        const inp = demo();
        const { result, check } = run(inp);
        expect(check.violations).toEqual([]);
        for (const j of result.jobs) {
            expect(['on_time', 'late', 'unfinished', 'blocked']).toContain(j.status);
            if (j.status !== 'on_time') expect(j.diagnosis).toBeTruthy();
        }
    });

    it('tính lại cho cùng dữ liệu luôn cho cùng kết quả (xác định)', () => {
        const a = runSchedule(demo());
        const b = runSchedule(demo());
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
});
