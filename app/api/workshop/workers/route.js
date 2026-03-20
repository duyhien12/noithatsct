import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const workers = await prisma.workshopWorker.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { tasks: true } },
        },
    });
    return NextResponse.json(workers);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { name, skill, phone, hourlyRate, notes, status } = body;

    if (!name?.trim()) {
        return NextResponse.json({ error: 'Tên thợ bắt buộc' }, { status: 400 });
    }

    const worker = await prisma.workshopWorker.create({
        data: {
            name: name.trim(),
            skill: skill?.trim() || '',
            phone: phone?.trim() || '',
            hourlyRate: Number(hourlyRate) || 0,
            notes: notes?.trim() || '',
            status: status || 'Hoạt động',
        },
    });
    return NextResponse.json(worker, { status: 201 });
});
