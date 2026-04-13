import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            code: true,
            name: true,
            contractValue: true,
            status: true,
            salaryProgress: true,
        },
        orderBy: { code: 'asc' },
    });

    return NextResponse.json({ data: projects });
});
