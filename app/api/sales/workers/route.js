import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const serializeWorker = (w) => ({
    id: w.id,
    name: w.name,
    workerType: w.workerType,
    position: w.position,
    phone: w.phone,
    birthdate: w.birthdate ?? null,
    dailyRate: Number(w.dailyRate) || 0,
    status: w.status,
    notes: w.notes,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    _count: { attendances: Number(w._attendanceCount ?? 0) },
});

export const GET = withAuth(async () => {
    const workers = await prisma.$queryRaw`
        SELECT sw.id, sw.name, sw."workerType", sw.position, sw.phone, sw.birthdate,
               sw."dailyRate", sw.status, sw.notes, sw."createdAt", sw."updatedAt",
               (SELECT COUNT(*) FROM "SalesAttendance" sa WHERE sa."workerId" = sw.id) as "_attendanceCount"
        FROM "SalesWorker" sw ORDER BY sw.name ASC
    `;
    return NextResponse.json(workers.map(serializeWorker));
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { name, workerType, position, phone, birthdate, dailyRate, notes, status } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Tên nhân viên bắt buộc' }, { status: 400 });

    const id = 'sw_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = new Date();
    const bd = birthdate ? new Date(birthdate) : null;

    await prisma.$executeRaw`
        INSERT INTO "SalesWorker" (id, name, "workerType", position, phone, birthdate, "dailyRate", status, notes, "createdAt", "updatedAt")
        VALUES (${id}, ${name.trim()}, ${workerType || 'Nhân viên KD'}, ${position?.trim() || ''},
                ${phone?.trim() || ''}, ${bd}, ${Number(dailyRate) || 0},
                ${status || 'Hoạt động'}, ${notes?.trim() || ''}, ${now}, ${now})
    `;

    const [w] = await prisma.$queryRaw`
        SELECT sw.id, sw.name, sw."workerType", sw.position, sw.phone, sw.birthdate,
               sw."dailyRate", sw.status, sw.notes, sw."createdAt", sw."updatedAt",
               0 as "_attendanceCount"
        FROM "SalesWorker" sw WHERE sw.id = ${id}
    `;
    return NextResponse.json(serializeWorker(w), { status: 201 });
});
