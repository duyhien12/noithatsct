import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Gợi ý ván thừa phù hợp trước khi đề nghị mua tấm mới (mục 10 spec): lọc theo loại ván gốc
 * và kích thước tối thiểu cần dùng, sắp theo diện tích còn dư nhỏ nhất trước (ưu tiên dùng hết
 * tấm nhỏ, để dành tấm lớn cho nhu cầu lớn hơn).
 */
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const parentMaterialId = searchParams.get('parentMaterialId');
    const minLength = Number(searchParams.get('minLength')) || 0;
    const minWidth = Number(searchParams.get('minWidth')) || 0;
    if (!parentMaterialId) return NextResponse.json({ error: 'Thiếu parentMaterialId' }, { status: 400 });

    const candidates = await prisma.invMaterialRemnant.findMany({
        where: {
            parentMaterialId, status: 'USABLE',
            length: { gte: minLength }, width: { gte: minWidth },
        },
        orderBy: { usableAreaM2: 'asc' },
        include: { warehouse: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
        take: 20,
    });
    return NextResponse.json({ data: candidates });
});
