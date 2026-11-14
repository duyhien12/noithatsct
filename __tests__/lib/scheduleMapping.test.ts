import { describe, it, expect } from 'vitest';
import { splitList, joinList, parseWeekdays, todayVN, toEngineTeams, toEngineJobs, planUpdatesFromResult } from '@/lib/schedule/mapping';
import { parseInstallTeam } from '@/lib/installTeams';
import { parseInstallPlan } from '@/app/api/workshop/install-plans/validate';

describe('chuỗi ngăn cách dấu phẩy', () => {
    it('tách và nối bỏ khoảng trắng và phần rỗng', () => {
        expect(splitList(' a, b,,c ')).toEqual(['a', 'b', 'c']);
        expect(splitList(null)).toEqual([]);
        expect(joinList(['x', ' y ', ''])).toBe('x,y');
    });

    it('ngày làm việc: bỏ giá trị ngoài 0–6', () => {
        expect(parseWeekdays('1,2,3,4,5,6')).toEqual([1, 2, 3, 4, 5, 6]);
        expect(parseWeekdays('1,9,x,0')).toEqual([1, 0]);
    });
});

describe('ngày hôm nay theo giờ Việt Nam', () => {
    it('23:00 UTC ngày 15 là 06:00 ngày 16 ở Việt Nam', () => {
        expect(todayVN(new Date('2026-11-15T23:00:00Z'))).toBe('2026-11-16');
    });
});

describe('chuyển đổi dữ liệu DB sang đầu vào bộ xếp lịch', () => {
    it('đội: chuyên môn, ngày làm, ngày nghỉ, thành viên', () => {
        const [t] = toEngineTeams([{
            id: 'T1', name: 'Đội 1', kind: 'Lắp đặt', memberCount: 2, memberIds: 'P1,P2', skills: 'tu_bep,tu_ao',
            workWeekdays: '1,2,3,4,5', offDates: '2026-11-20', allowPartial: false, active: true, order: 1,
        }]);
        expect(t.memberIds).toEqual(['P1', 'P2']);
        expect(t.skills).toEqual(['tu_bep', 'tu_ao']);
        expect(t.workWeekdays).toEqual([1, 2, 3, 4, 5]);
        expect(t.offDates).toEqual(['2026-11-20']);
    });

    it('công việc: ngày theo YYYY-MM-DD và khóa lấy cửa sổ từ ngày bắt đầu/kết thúc', () => {
        const [j] = toEngineJobs([{
            id: 'P1', name: 'Tủ bếp', customerId: 'C1', customer: { name: 'Nhà A' }, priority: 2, effortHours: 40, doneHours: 8,
            deadline: new Date('2026-11-30T00:00:00Z'), startNotBefore: null, readyDate: new Date('2026-11-18T00:00:00Z'),
            siteReadyDate: null, skill: 'tu_bep', maxTeams: 1, travelDays: 0, allowOvertime: true, dependsOn: 'P0,P9',
            locked: true, teams: [{ teamId: 'T1' }], startDate: new Date('2026-11-16T00:00:00Z'), endDate: new Date('2026-11-20T00:00:00Z'),
        }]);
        expect(j.deadline).toBe('2026-11-30');
        expect(j.readyDate).toBe('2026-11-18');
        expect(j.dependsOn).toEqual(['P0', 'P9']);
        expect(j.lockedTeamIds).toEqual(['T1']);
        expect(j.lockedStart).toBe('2026-11-16');
        expect(j.lockedEnd).toBe('2026-11-20');
        expect(j.doneHours).toBe(8);
    });
});

describe('chốt kế hoạch: chỉ ghi công việc được xếp, bỏ việc khóa và việc chưa xong', () => {
    it('lấy đội là hợp các đội trong các đoạn làm việc', () => {
        const result = {
            jobs: [
                { id: 'A', locked: false, plannedStart: '2026-11-16', plannedEnd: '2026-11-17' },
                { id: 'B', locked: true, plannedStart: '2026-11-16', plannedEnd: '2026-11-16' },
                { id: 'C', locked: false, plannedStart: null, plannedEnd: null },
            ],
            segments: [
                { jobId: 'A', teamId: 'T1', date: '2026-11-16' },
                { jobId: 'A', teamId: 'T2', date: '2026-11-17' },
                { jobId: 'A', teamId: 'T1', date: '2026-11-17' },
                { jobId: 'B', teamId: 'T3', date: '2026-11-16' },
            ],
        };
        const { updates, skipped } = planUpdatesFromResult(result);
        expect(updates).toEqual([{ planId: 'A', startDate: '2026-11-16', endDate: '2026-11-17', teamIds: ['T1', 'T2'] }]);
        expect(skipped.map(x => x.planId).sort()).toEqual(['B', 'C']);
    });
});

describe('kiểm tra dữ liệu đội khi lưu', () => {
    it('ngày làm việc được sắp và loại trùng', () => {
        const { data } = parseInstallTeam({ workWeekdays: [6, 1, 1] });
        expect(data?.workWeekdays).toBe('1,6');
    });

    it('từ chối ngày làm việc ngoài 0–6 và ngày nghỉ sai định dạng', () => {
        expect(parseInstallTeam({ workWeekdays: [7] }).error).toBeTruthy();
        expect(parseInstallTeam({ offDates: '16/11/2026' }).error).toBeTruthy();
    });

    it('chuyên môn và thành viên nhận chuỗi ngăn cách bằng dấu phẩy', () => {
        const { data } = parseInstallTeam({ skills: ' tu_bep ,tu_ao', memberIds: 'P1, P2' });
        expect(data).toMatchObject({ skills: 'tu_bep,tu_ao', memberIds: 'P1,P2' });
    });
});

describe('kiểm tra dữ liệu công việc khi lưu', () => {
    it('chấp nhận thông tin xếp lịch, để trống thì là null', () => {
        const { data, error } = parseInstallPlan({
            startDate: '2026-11-16', endDate: '2026-11-18', effortHours: '', deadline: '2026-11-30',
            priority: '2', maxTeams: 1, travelDays: 0, dependsOn: 'A, B', allowOvertime: 1, locked: false,
        });
        expect(error).toBeUndefined();
        expect(data?.effortHours).toBeNull();
        expect(data?.priority).toBe(2);
        expect(data?.dependsOn).toBe('A,B');
        expect(data?.allowOvertime).toBe(true);
    });

    it('từ chối mức ưu tiên ngoài 1–5, số đội tối đa ngoài 1–5, ngày sai', () => {
        expect(parseInstallPlan({ startDate: '2026-11-16', endDate: '2026-11-18', priority: 6 }).error).toBeTruthy();
        expect(parseInstallPlan({ startDate: '2026-11-16', endDate: '2026-11-18', maxTeams: 0 }).error).toBeTruthy();
        expect(parseInstallPlan({ startDate: '2026-11-16', endDate: '2026-11-18', deadline: 'không phải ngày' }).error).toBeTruthy();
    });
});

import { runSchedule, verifySchedule } from '@/lib/schedule/engine';

describe('luồng đầy đủ: dữ liệu DB dạng thật → engine → kiểm tra độc lập', () => {
    it('ghép các bước không lỗi và kết quả hợp lệ', () => {
        const teamRows = [
            { id: 'T1', name: 'Đội 1', kind: 'Lắp đặt', memberCount: 2, memberIds: 'P1,P2', skills: 'tu_bep', workWeekdays: '1,2,3,4,5,6', offDates: '', allowPartial: false, active: true, order: 1 },
            { id: 'T4', name: 'Đội 4 (xưởng)', kind: 'Xưởng', memberCount: 2, memberIds: '', skills: '', workWeekdays: '1,2,3,4,5,6', offDates: '', allowPartial: false, active: true, order: 4 },
        ];
        const planRows = [
            { id: 'J1', name: 'Tủ bếp', customerId: 'C1', customerName: '', customer: { name: 'Nhà A' }, priority: 1, effortHours: 40, doneHours: 0,
              deadline: new Date('2026-11-25T00:00:00Z'), startNotBefore: null, readyDate: null, siteReadyDate: null, skill: 'tu_bep',
              maxTeams: 1, travelDays: 0, allowOvertime: false, dependsOn: '', locked: false, teams: [], startDate: new Date('2026-11-16T00:00:00Z'), endDate: new Date('2026-11-17T00:00:00Z') },
            { id: 'J2', name: 'Ốp vách', customerId: null, customerName: 'Nhà B', customer: null, priority: 2, effortHours: null, doneHours: 0,
              deadline: new Date('2026-11-25T00:00:00Z'), startNotBefore: null, readyDate: null, siteReadyDate: null, skill: '',
              maxTeams: 1, travelDays: 0, allowOvertime: false, dependsOn: 'J1', locked: false, teams: [], startDate: new Date('2026-11-16T00:00:00Z'), endDate: new Date('2026-11-17T00:00:00Z') },
        ];
        const input = {
            today: '2026-11-16',
            settings: {},
            teams: toEngineTeams(teamRows),
            jobs: toEngineJobs(planRows),
        };
        const result = runSchedule(input);
        // J2 thiếu khối lượng nên không được xếp và phải được báo
        expect(result.jobs.map(j => j.id)).toEqual(['J1']);
        expect(result.issues.some(i => i.type === 'MISSING_DATA' && i.jobId === 'J2')).toBe(true);
        expect(result.jobs[0].status).toBe('on_time');
        expect(verifySchedule(result, input).ok).toBe(true);
        const { updates } = planUpdatesFromResult(result);
        expect(updates.map(u => u.planId)).toEqual(['J1']);
    });
});
