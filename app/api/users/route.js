import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const users = await prisma.$queryRaw`
        SELECT id, name, role, department
        FROM "User"
        WHERE active = true
        ORDER BY name ASC
    `;
    return NextResponse.json(users);
});
