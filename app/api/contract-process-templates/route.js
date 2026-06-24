import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const where = type ? { type } : {};
    const templates = await prisma.contractProcessTemplate.findMany({
        where,
        include: { steps: { orderBy: { sortOrder: 'asc' } } },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(templates);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { name, type, description, steps, isDefault } = body;
    const template = await prisma.contractProcessTemplate.create({
        data: {
            name,
            type,
            description: description || '',
            isDefault: isDefault || false,
            steps: {
                create: (steps || []).map(s => ({
                    wbs: s.wbs || '',
                    name: s.name,
                    department: s.department || '',
                    duration: s.duration || 1,
                    sortOrder: s.sortOrder || 0,
                    level: s.level || 0,
                    isPaymentStep: s.isPaymentStep || false,
                    paymentPercent: s.paymentPercent || 0,
                    color: s.color || '',
                })),
            },
        },
        include: { steps: true },
    });
    return NextResponse.json(template, { status: 201 });
});
