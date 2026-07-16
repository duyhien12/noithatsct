import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { DEFAULT_STAGE_TEMPLATES } from '@/lib/manufacturing/constants';

// Idempotent: chỉ tạo các công đoạn mặc định còn thiếu (so theo tên), không xóa/ghi đè công đoạn đã có.
export const POST = withAuth(async () => {
    const existing = await prisma.mfgStageTemplate.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map(t => t.name));
    const missing = DEFAULT_STAGE_TEMPLATES.filter(t => !existingNames.has(t.name));

    if (missing.length === 0) return NextResponse.json({ created: 0 });

    let count = existing.length;
    const created = [];
    for (const t of missing) {
        count++;
        created.push(await prisma.mfgStageTemplate.create({
            data: {
                code: `CD${String(count).padStart(3, '0')}`,
                name: t.name,
                sequence: t.sequence,
                isRequired: t.isRequired,
            },
        }));
    }
    return NextResponse.json({ created: created.length });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
