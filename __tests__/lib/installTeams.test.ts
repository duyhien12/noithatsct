import { describe, it, expect } from 'vitest';
import { rangesOverlap, parseInstallTeam, findTeamConflicts, sumMembers } from '@/lib/installTeams';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe('rangesOverlap', () => {
    it('khoảng chồng nhau, kể cả chạm đúng một ngày', () => {
        expect(rangesOverlap(d('2026-11-01'), d('2026-11-10'), d('2026-11-05'), d('2026-11-20'))).toBe(true);
        expect(rangesOverlap(d('2026-11-01'), d('2026-11-10'), d('2026-11-10'), d('2026-11-20'))).toBe(true);
    });

    it('khoảng liền kề nhưng không chạm thì không chồng', () => {
        expect(rangesOverlap(d('2026-11-01'), d('2026-11-10'), d('2026-11-11'), d('2026-11-20'))).toBe(false);
    });
});

describe('parseInstallTeam', () => {
    it('từ chối tên rỗng và loại đội lạ', () => {
        expect(parseInstallTeam({ name: '   ' }).error).toBeTruthy();
        expect(parseInstallTeam({ kind: 'Khác' }).error).toBeTruthy();
    });

    it('từ chối số thành viên ngoài 1–50', () => {
        expect(parseInstallTeam({ memberCount: 0 }).error).toBeTruthy();
        expect(parseInstallTeam({ memberCount: 51 }).error).toBeTruthy();
        expect(parseInstallTeam({ memberCount: '2.5' }).error).toBeTruthy();
    });

    it('nhận số thành viên dạng chuỗi và chuẩn hóa tên', () => {
        const { data } = parseInstallTeam({ name: '  Đội 1 ', kind: 'Xưởng', memberCount: '4', active: 0 });
        expect(data).toEqual({ name: 'Đội 1', kind: 'Xưởng', memberCount: 4, active: false });
    });
});

describe('findTeamConflicts', () => {
    const plan = (id: string, start: string, end: string, teamIds: string[]) => ({
        id,
        startDate: d(start),
        endDate: d(end),
        customerName: id,
        teams: teamIds.map(teamId => ({ teamId, team: { name: `Đội ${teamId}` } })),
    });

    it('báo trùng khi cùng đội và trùng ngày', () => {
        const plans = [plan('A', '2026-11-01', '2026-11-10', ['t1'])];
        const out = findTeamConflicts({ teamIds: ['t1'], startDate: d('2026-11-08'), endDate: d('2026-11-15'), plans });
        expect(out).toHaveLength(1);
        expect(out[0].teamId).toBe('t1');
    });

    it('không báo trùng khi khác đội hoặc khác ngày', () => {
        const plans = [plan('A', '2026-11-01', '2026-11-10', ['t1'])];
        expect(findTeamConflicts({ teamIds: ['t2'], startDate: d('2026-11-05'), endDate: d('2026-11-06'), plans })).toHaveLength(0);
        expect(findTeamConflicts({ teamIds: ['t1'], startDate: d('2026-11-11'), endDate: d('2026-11-12'), plans })).toHaveLength(0);
    });
});

describe('sumMembers', () => {
    it('cộng thành viên các đội, bỏ qua đội thiếu số liệu', () => {
        expect(sumMembers([{ memberCount: 2 }, { memberCount: 4 }, {}])).toBe(6);
        expect(sumMembers([])).toBe(0);
    });
});
