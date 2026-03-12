import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request) {
    const { email, newPassword } = await request.json();

    if (!email?.trim() || !newPassword) {
        return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 });
    }
    if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
        // Return success to avoid email enumeration
        return NextResponse.json({ success: true });
    }

    const hashed = hashSync(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
    });

    return NextResponse.json({ success: true });
}
