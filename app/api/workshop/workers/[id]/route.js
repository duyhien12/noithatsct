import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (req, { params }) => {
    const { id } = await params;
    const body = await req.json();
    const { name, skill, phone, hourlyRate, notes, status } = body;

    const worker = await prisma.workshopWorker.update({
        where: { id },
        data: {
            ...(name !== undefined && { name: name.trim() }),
            ...(skill !== undefined && { skill: skill.trim() }),
            ...(phone !== undefined && { phone: phone.trim() }),
            ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) || 0 }),
            ...(notes !== undefined && { notes: notes.trim() }),
            ...(status !== undefined && { status }),
        },
    });
    return NextResponse.json(worker);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { id } = await params;
    await prisma.workshopWorker.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
