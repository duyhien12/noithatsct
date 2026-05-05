import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7);

    const entries = await prisma.workshopPLEntry.findMany({
        where: { period },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ entries });
});

export const POST = withAuth(async (req, _, session) => {
    const body = await req.json();
    const createdBy = session?.user?.name || session?.user?.email || '';

    // Bulk import
    if (Array.isArray(body)) {
        const result = await prisma.workshopPLEntry.createMany({
            data: body.map(item => ({
                period: item.period,
                entryType: item.entryType,
                description: item.description,
                amount: parseFloat(item.amount) || 0,
                notes: item.notes || null,
                assignedTo: item.assignedTo || null,
                createdBy,
            })),
        });
        return NextResponse.json({ count: result.count }, { status: 201 });
    }

    // Single create
    const { period, entryType, description, amount, notes, assignedTo } = body;
    if (!period || !entryType || !description || amount === undefined) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const entry = await prisma.workshopPLEntry.create({
        data: {
            period,
            entryType,
            description,
            amount: parseFloat(amount) || 0,
            notes: notes || null,
            assignedTo: assignedTo || null,
            createdBy,
        },
    });

    return NextResponse.json(entry, { status: 201 });
});
