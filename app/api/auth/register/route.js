import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request) {
    const { name, email, password, department } = await request.json();

    if (!name?.trim() || !email?.trim() || !password) {
        return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
        return NextResponse.json({ error: 'Email này đã được đăng ký' }, { status: 409 });
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

    const hashed = hashSync(password, 10);
    await prisma.user.create({
        data: {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashed,
            role,
            department: department?.trim() || '',
            active: false, // Cần admin kích hoạt
        },
    });

    return NextResponse.json({ success: true });
}
