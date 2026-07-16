import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const { name, description, sequence, productCategory, defaultDurationHours, isRequired, isActive } = body;

    const template = await prisma.mfgStageTemplate.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(sequence !== undefined && { sequence: Number(sequence) }),
            ...(productCategory !== undefined && { productCategory }),
            ...(defaultDurationHours !== undefined && { defaultDurationHours: Number(defaultDurationHours) }),
            ...(isRequired !== undefined && { isRequired }),
            ...(isActive !== undefined && { isActive }),
        },
    });
    return NextResponse.json(template);
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd', 'xuong'] });

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const inUse = await prisma.mfgItemStage.count({ where: { stageTemplateId: id } });
    if (inUse > 0) {
        // Không xóa mẫu đã dùng thực tế — chỉ vô hiệu hóa để tránh vỡ dữ liệu công đoạn đã áp dụng
        await prisma.mfgStageTemplate.update({ where: { id }, data: { isActive: false } });
        return NextResponse.json({ ok: true, deactivated: true });
    }
    await prisma.mfgStageTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
