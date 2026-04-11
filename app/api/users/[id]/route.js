import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';

// PUT: cập nhật user (role, department, name, password)
export const PUT = withAuth(async (req, context) => {
    const { id } = await context.params;
    const body = await req.json();
    const { name, role, department, phone, active, password, zaloUserId } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (active !== undefined) updateData.active = active;
    if (password?.trim()) updateData.password = hashSync(password, 10);
    if (zaloUserId !== undefined) updateData.zaloUserId = zaloUserId.trim();

    const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, department: true, phone: true, active: true, zaloUserId: true },
    });

    return NextResponse.json(user);
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });

// DELETE: xóa hẳn hoặc vô hiệu hóa
// ?permanent=true → xóa hẳn khỏi DB
// không có param → vô hiệu hóa (active=false)
export const DELETE = withAuth(async (req, context) => {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
        await prisma.user.delete({ where: { id } });
    } else {
        await prisma.user.update({ where: { id }, data: { active: false } });
    }

    return NextResponse.json({ success: true });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
