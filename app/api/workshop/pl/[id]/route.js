import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const PUT = withAuth(async (req, context) => {
    const { id } = await context.params;
    const body = await req.json();
    const { entryType, description, amount, notes, assignedTo } = body;

    if (!entryType || !description || amount === undefined) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const entry = await prisma.workshopPLEntry.update({
        where: { id },
        data: {
            entryType,
            description,
            amount: parseFloat(amount) || 0,
            notes: notes || null,
            assignedTo: assignedTo || null,
        },
    });

    return NextResponse.json(entry);
});

export const DELETE = withAuth(async (req, context) => {
    const { id } = await context.params;
    await prisma.workshopPLEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
