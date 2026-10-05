import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { designWorkLogCreateSchema } from '@/lib/validations/designWorkLog';
import { VIEW_ROLES, MANAGE_ROLES } from '@/lib/designTaskStatus';

// Nhật ký tuần TKKT — lấy theo khoảng ngày (start, end dạng YYYY-MM-DD).
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    if (!start || !end) return NextResponse.json({ error: 'Thiếu start/end' }, { status: 400 });

    const entries = await prisma.designWorkLog.findMany({
        where: { date: { gte: new Date(start), lte: new Date(end + 'T23:59:59') } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(entries);
}, { roles: VIEW_ROLES });

export const POST = withAuth(async (request, context, session) => {
    const data = designWorkLogCreateSchema.parse(await request.json());
    if (data.workers === '[]' && !data.note && !data.projectName) {
        return NextResponse.json({ error: 'Chọn người thực hiện hoặc nhập nội dung' }, { status: 400 });
    }
    const entry = await prisma.designWorkLog.create({
        data: { ...data, createdBy: session.user.name || '' },
    });
    return NextResponse.json(entry, { status: 201 });
}, { roles: MANAGE_ROLES });
