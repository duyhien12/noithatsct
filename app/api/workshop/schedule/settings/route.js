import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getSettingsRow, SCHEDULE_ROLES, APPROVE_ROLES } from '../shared';
import { parseWeekdays, joinList } from '@/lib/schedule/mapping';

// Cấu hình giờ làm và trần tăng ca (tăng ca tối đa 3 giờ/người/ngày theo quy định)
export const GET = withAuth(async () => {
    const row = await getSettingsRow();
    return NextResponse.json({ ...row, otWeekdays: parseWeekdays(row.otWeekdays) });
}, { roles: SCHEDULE_ROLES });

export const PUT = withAuth(async (req) => {
    const body = await req.json();
    const data = {};
    const ints = [['hoursPerDay', 1, 12], ['otMaxPerDay', 0, 3], ['otMaxPerMonth', 0, 200], ['otMaxPerYear', 0, 2400]];
    for (const [k, min, max] of ints) {
        if (body[k] === undefined) continue;
        const n = Number(body[k]);
        if (!Number.isInteger(n) || n < min || n > max) {
            return NextResponse.json({ error: `${k} phải là số nguyên từ ${min} đến ${max}` }, { status: 400 });
        }
        data[k] = n;
    }
    if (body.otWeekdays !== undefined) {
        const days = [...new Set((body.otWeekdays || []).map(Number))];
        if (days.some(n => !Number.isInteger(n) || n < 0 || n > 6)) {
            return NextResponse.json({ error: 'Ngày tăng ca phải từ 0 (CN) đến 6 (T7)' }, { status: 400 });
        }
        data.otWeekdays = joinList(days.sort((a, b) => a - b));
    }
    const row = await prisma.scheduleSettings.upsert({ where: { id: 'default' }, update: data, create: { id: 'default', ...data } });
    return NextResponse.json({ ...row, otWeekdays: parseWeekdays(row.otWeekdays) });
}, { roles: APPROVE_ROLES });
