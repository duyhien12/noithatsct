import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Public GET - no auth required (for shared PDF links)
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
            customer: { select: { name: true, phone: true, email: true, address: true } },
            project: { select: { name: true, address: true, code: true } },
            categories: {
                include: { items: { orderBy: { order: 'asc' } } },
                orderBy: { order: 'asc' },
            },
            items: { orderBy: { order: 'asc' } },
        },
    });
    if (!quotation) return NextResponse.json({ error: 'Báo giá không tồn tại' }, { status: 404 });
    return NextResponse.json(quotation);
}, { public: true });
