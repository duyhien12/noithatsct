import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const serializeRecord = (r) => ({
    id: r.id,
    workerId: r.workerId,
    date: r.date,
    hoursWorked: Number(r.hoursWorked) || 0,
    notes: r.notes || '',
    createdAt: r.createdAt,
    worker: {
        id: r.workerId,
        name: r.wName,
        position: r.wPosition || '',
        dailyRate: Number(r.wDailyRate) || 0,
    },
});

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get('workerId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    let records;
    if (month) {
        const [y, m] = month.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 1);
        if (workerId) {
            records = await prisma.$queryRaw`
                SELECT sa.id, sa."workerId", sa.date, sa."hoursWorked", sa.notes, sa."createdAt",
                       sw.name as "wName", sw.position as "wPosition", sw."dailyRate" as "wDailyRate"
                FROM "SalesAttendance" sa JOIN "SalesWorker" sw ON sw.id = sa."workerId"
                WHERE sa.date >= ${start} AND sa.date < ${end} AND sa."workerId" = ${workerId}
                ORDER BY sa.date ASC
            `;
        } else {
            records = await prisma.$queryRaw`
                SELECT sa.id, sa."workerId", sa.date, sa."hoursWorked", sa.notes, sa."createdAt",
                       sw.name as "wName", sw.position as "wPosition", sw."dailyRate" as "wDailyRate"
                FROM "SalesAttendance" sa JOIN "SalesWorker" sw ON sw.id = sa."workerId"
                WHERE sa.date >= ${start} AND sa.date < ${end}
                ORDER BY sa.date ASC
            `;
        }
    } else if (date) {
        const d = new Date(date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        records = await prisma.$queryRaw`
            SELECT sa.id, sa."workerId", sa.date, sa."hoursWorked", sa.notes, sa."createdAt",
                   sw.name as "wName", sw.position as "wPosition", sw."dailyRate" as "wDailyRate"
            FROM "SalesAttendance" sa JOIN "SalesWorker" sw ON sw.id = sa."workerId"
            WHERE sa.date >= ${d} AND sa.date < ${nextDay}
            ORDER BY sa.date DESC LIMIT 200
        `;
    } else {
        records = await prisma.$queryRaw`
            SELECT sa.id, sa."workerId", sa.date, sa."hoursWorked", sa.notes, sa."createdAt",
                   sw.name as "wName", sw.position as "wPosition", sw."dailyRate" as "wDailyRate"
            FROM "SalesAttendance" sa JOIN "SalesWorker" sw ON sw.id = sa."workerId"
            ORDER BY sa.date DESC LIMIT 200
        `;
    }

    return NextResponse.json((records || []).map(serializeRecord));
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { workerId, date, hoursWorked, notes } = body;
    if (!workerId || !date) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

    const dateObj = new Date(date);
    const noteStr = notes?.trim() || '';

    if (Number(hoursWorked) === 0) {
        await prisma.$executeRaw`DELETE FROM "SalesAttendance" WHERE "workerId" = ${workerId} AND date = ${dateObj}`;
        return NextResponse.json({ deleted: true });
    }

    const hours = Number(hoursWorked) > 0 ? Number(hoursWorked) : 8;
    const now = new Date();

    const updated = await prisma.$executeRaw`
        UPDATE "SalesAttendance" SET "hoursWorked" = ${hours}, notes = ${noteStr}
        WHERE "workerId" = ${workerId} AND date = ${dateObj}
    `;

    if (Number(updated) === 0) {
        const id = 'sa_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        await prisma.$executeRaw`
            INSERT INTO "SalesAttendance" (id, "workerId", date, "hoursWorked", notes, "createdAt")
            VALUES (${id}, ${workerId}, ${dateObj}, ${hours}, ${noteStr}, ${now})
        `;
    }

    const [r] = await prisma.$queryRaw`
        SELECT sa.id, sa."workerId", sa.date, sa."hoursWorked", sa.notes, sa."createdAt",
               sw.name as "wName", sw.position as "wPosition", sw."dailyRate" as "wDailyRate"
        FROM "SalesAttendance" sa JOIN "SalesWorker" sw ON sw.id = sa."workerId"
        WHERE sa."workerId" = ${workerId} AND sa.date = ${dateObj}
    `;
    return NextResponse.json(serializeRecord(r));
});
