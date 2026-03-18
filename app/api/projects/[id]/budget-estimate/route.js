import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const rows = await prisma.$queryRaw`
        SELECT "budgetEstimateData" FROM "Project" WHERE id = ${id}
    `;
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: rows[0].budgetEstimateData || null });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const json = JSON.stringify(body.data);
    await prisma.$executeRaw`
        UPDATE "Project" SET "budgetEstimateData" = ${json}::jsonb, "updatedAt" = NOW() WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
});
