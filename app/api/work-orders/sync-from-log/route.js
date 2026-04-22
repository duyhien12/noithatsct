import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

function parseWorkerNames(json) {
    try {
        const v = JSON.parse(json);
        if (!Array.isArray(v)) return [];
        return v.map(item => typeof item === 'string' ? item : item?.name).filter(Boolean);
    } catch { return []; }
}

export const POST = withAuth(async (req) => {
    const { start, end } = await req.json();
    if (!start || !end) {
        return NextResponse.json({ error: 'Cần cung cấp start và end' }, { status: 400 });
    }

    // Lấy tất cả entries trong tuần có projectId (bỏ qua Việc khác và Nhân công nghỉ)
    const entries = await prisma.workLogEntry.findMany({
        where: {
            date: { gte: new Date(start), lte: new Date(end + 'T23:59:59') },
            projectId: { not: null },
            category: { notIn: ['Việc khác', 'Nhân công nghỉ'] },
        },
        include: { project: { select: { id: true, code: true, name: true } } },
        orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    });

    if (entries.length === 0) {
        return NextResponse.json({ created: 0, skipped: 0, message: 'Không có dữ liệu trong khoảng thời gian này' });
    }

    // Lấy các sourceLogId đã tồn tại
    const existingLogIds = new Set(
        (await prisma.workOrder.findMany({
            where: { sourceLogId: { in: entries.map(e => e.id) } },
            select: { sourceLogId: true },
        })).map(w => w.sourceLogId)
    );

    let created = 0, skipped = 0;

    for (const entry of entries) {
        if (existingLogIds.has(entry.id)) { skipped++; continue; }

        const workers = parseWorkerNames(entry.mainWorkers);
        const dateStr = new Date(entry.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        const title = `[${entry.shift}] ${entry.category} - ${entry.projectName || entry.project?.name || ''} (${dateStr})`;
        const code = await generateCode('workOrder', 'WO');

        await prisma.workOrder.create({
            data: {
                code,
                title,
                description: workers.length > 0 ? `Người thực hiện: ${workers.join(', ')}` : '',
                category: entry.category,
                assignee: workers.join(', '),
                dueDate: new Date(entry.date),
                status: 'Chờ xử lý',
                priority: 'Trung bình',
                projectId: entry.projectId,
                sourceLogId: entry.id,
            },
        });
        created++;
    }

    return NextResponse.json({ created, skipped, total: entries.length });
});
