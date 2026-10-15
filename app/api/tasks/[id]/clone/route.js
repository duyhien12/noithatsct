import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const SUBTASK_INCLUDE = { subTasks: { orderBy: { createdAt: 'asc' }, include: { subTasks: { orderBy: { createdAt: 'asc' } } } } };

// Nhân bản tác vụ kèm toàn bộ tác vụ con (dùng cho cột Tác vụ mẫu: kéo mẫu ra cột khác / lưu việc thành mẫu).
// Bản sao: trạng thái = status gửi lên, tác vụ con reset về "Việc sẽ làm", bỏ hạn.
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { status, order } = await request.json();
    if (!status) return NextResponse.json({ error: 'Thiếu trạng thái' }, { status: 400 });

    const source = await prisma.task.findUnique({ where: { id }, include: SUBTASK_INCLUDE });
    if (!source) return NextResponse.json({ error: 'Không tìm thấy tác vụ' }, { status: 404 });

    const createdBy = session?.user?.name || '';
    const copyFields = (t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        assignee: t.assignee,
        createdBy,
    });

    const clone = await prisma.$transaction(async (tx) => {
        const root = await tx.task.create({
            data: {
                ...copyFields(source),
                status,
                order: order ?? 0,
                recurringType: source.recurringType,
                recurringDays: source.recurringDays,
                recurringInterval: source.recurringInterval,
                recurringEndDate: source.recurringEndDate,
            },
        });
        for (const sub of source.subTasks) {
            const subCopy = await tx.task.create({ data: { ...copyFields(sub), status: 'Việc sẽ làm', parentId: root.id } });
            for (const child of sub.subTasks) {
                await tx.task.create({ data: { ...copyFields(child), status: 'Việc sẽ làm', parentId: subCopy.id } });
            }
        }
        return tx.task.findUnique({ where: { id: root.id }, include: SUBTASK_INCLUDE });
    });

    return NextResponse.json(clone, { status: 201 });
});
