import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';

// GET: list all users (active + inactive)
export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let users;
    try {
        users = await prisma.user.findMany({
            where: includeInactive ? {} : { active: true },
            orderBy: { name: 'asc' },
            select: {
                id: true, name: true, email: true,
                role: true, department: true, phone: true,
                zaloUserId: true, active: true, createdAt: true,
            },
        });
    } catch {
        // Fallback: query không có zaloUserId (tương thích Prisma client cũ)
        users = await prisma.user.findMany({
            where: includeInactive ? {} : { active: true },
            orderBy: { name: 'asc' },
            select: {
                id: true, name: true, email: true,
                role: true, department: true, phone: true,
                active: true, createdAt: true,
            },
        });
    }
    return NextResponse.json(users);
});

// POST: tạo user mới
export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { name, email, password, role, department, phone } = body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 409 });
    }

    const user = await prisma.user.create({
        data: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashSync(password, 10),
            role: role || 'ky_thuat',
            department: department || '',
            phone: phone?.trim() || '',
            active: true,
        },
        select: { id: true, name: true, email: true, role: true, department: true, phone: true, active: true },
    });

    return NextResponse.json(user, { status: 201 });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
