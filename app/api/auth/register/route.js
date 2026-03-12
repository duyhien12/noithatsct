import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(request) {
    const { name, email, password, department } = await request.json();

    if (!name?.trim() || !email?.trim() || !password) {
        return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    // Auto-assign role based on department
    const DEPT_ROLE_MAP = {
        'Phòng kinh doanh': 'kinh_doanh',
        'Phòng xây dựng': 'ky_thuat',
        'Phòng thiết kế': 'ky_thuat',
        'Phòng hành chính kế toán': 'ke_toan',
        'Marketing': 'kinh_doanh',
        'Xưởng nội thất': 'ky_thuat',
    };
    const role = DEPT_ROLE_MAP[department?.trim()] || 'ky_thuat';
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const hashed = hashSync(password, 10);
    const now = new Date();

    try {
        // Use raw SQL to bypass Prisma client schema cache issues
        const existing = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = ${cleanEmail} LIMIT 1`;
        if (existing.length > 0) {
            return NextResponse.json({ error: 'Email này đã được đăng ký' }, { status: 409 });
        }

        const id = randomBytes(12).toString('hex');
        await prisma.$executeRaw`
            INSERT INTO "User" (id, email, name, password, role, active, "createdAt", "updatedAt")
            VALUES (${id}, ${cleanEmail}, ${cleanName}, ${hashed}, ${role}, true, ${now}, ${now})
        `;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Register error:', err);
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
}
