import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Chỉ Ban giám đốc/admin được thêm/sửa/xóa hồ sơ nhân công (đơn giá là dữ liệu lương nhạy cảm) —
// xưởng vẫn xem được danh sách và chấm công/OT bình thường (route khác, không bị chặn ở đây).
const WORKER_EDIT_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];

export const GET = withAuth(async () => {
    const workers = await prisma.workshopWorker.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { tasks: true } },
        },
    });
    return NextResponse.json(workers);
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const { name, skill, phone, hourlyRate, notes, status, workerType } = body;

    if (!name?.trim()) {
        return NextResponse.json({ error: 'Tên thợ bắt buộc' }, { status: 400 });
    }

    const worker = await prisma.workshopWorker.create({
        data: {
            name: name.trim(),
            workerType: workerType || 'Thợ chính',
            skill: skill?.trim() || '',
            phone: phone?.trim() || '',
            hourlyRate: Number(hourlyRate) || 0,
            notes: notes?.trim() || '',
            status: status || 'Hoạt động',
        },
    });
    return NextResponse.json(worker, { status: 201 });
}, { roles: WORKER_EDIT_ROLES });
