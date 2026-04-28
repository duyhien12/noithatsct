import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { name, workerType, position, phone, birthdate, dailyRate, notes, status } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Tên nhân viên bắt buộc' }, { status: 400 });

    const now = new Date();
    const bd = birthdate ? new Date(birthdate) : null;

    await prisma.$executeRaw`
        UPDATE "SalesWorker"
        SET name = ${name.trim()}, "workerType" = ${workerType || 'Nhân viên KD'},
            position = ${position?.trim() || ''}, phone = ${phone?.trim() || ''},
            birthdate = ${bd}, "dailyRate" = ${Number(dailyRate) || 0},
            status = ${status || 'Hoạt động'}, notes = ${notes?.trim() || ''},
            "updatedAt" = ${now}
        WHERE id = ${id}
    `;

    const [worker] = await prisma.$queryRaw`SELECT * FROM "SalesWorker" WHERE id = ${id}`;
    return NextResponse.json({ ...worker, dailyRate: Number(worker.dailyRate) || 0 });
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.$executeRaw`DELETE FROM "SalesAttendance" WHERE "workerId" = ${id}`;
    await prisma.$executeRaw`DELETE FROM "SalesWorker" WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
});
