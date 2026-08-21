import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { loanContactUpdateSchema } from '@/lib/validations/loanContact';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = loanContactUpdateSchema.parse(body);
    const updated = await prisma.loanContact.update({ where: { id }, data });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    await prisma.loanContact.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
