import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const allowed = ['title', 'type', 'assignee', 'status', 'notes'];
    const data = {};
    allowed.forEach(k => { if (body[k] !== undefined) data[k] = body[k]; });
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;

    const commitment = await prisma.commitment.update({ where: { id }, data });
    return NextResponse.json(commitment);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.commitment.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
