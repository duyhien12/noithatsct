import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { withCodeRetry } from '@/lib/generateCode';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const SLA_HOURS = { 'Khẩn cấp': 4, 'Cao': 24, 'Trung bình': 72, 'Thấp': 168 };

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');

    const where = { deletedAt: null };
    if (status) where.status = status;
    if (type) where.type = type;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { assignee: { contains: search, mode: 'insensitive' } },
            { reportedBy: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [records, total] = await Promise.all([
        prisma.maintenanceRecord.findMany({
            where,
            include: { project: { select: { name: true, code: true, address: true } } },
            orderBy: [{ slaDeadline: 'asc' }, { createdAt: 'desc' }],
            skip,
            take: limit,
        }),
        prisma.maintenanceRecord.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(records, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const {
        title, type, category, priority, status, description, notes,
        assignee, reportedBy, scheduledDate, nextScheduleDate,
        warrantyEndDate, estimatedCost, projectId,
    } = body;

    if (!title?.trim() || !projectId) {
        return NextResponse.json({ error: 'Thiếu tiêu đề hoặc dự án' }, { status: 400 });
    }

    const now = new Date();
    const slaHours = SLA_HOURS[priority] ?? 72;
    const slaDeadline = new Date(now.getTime() + slaHours * 3_600_000);

    // Repeat issue detection: same project + same category within 12 months
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 3_600_000);
    const previous = await prisma.maintenanceRecord.findFirst({
        where: {
            projectId,
            category: category || 'Khác',
            deletedAt: null,
            createdAt: { gte: twelveMonthsAgo },
        },
        orderBy: { createdAt: 'desc' },
    });
    const isRepeatIssue = !!previous;
    const repeatCount = previous ? (previous.repeatCount + 1) : 0;

    const record = await withCodeRetry('maintenanceRecord', 'BD', (code) =>
        prisma.maintenanceRecord.create({
            data: {
                code,
                title: title.trim(),
                type: type || 'Bảo hành',
                category: category || 'Khác',
                priority: priority || 'Trung bình',
                status: status || 'Tiếp nhận',
                description: description || '',
                notes: notes || '',
                assignee: assignee || '',
                reportedBy: reportedBy || '',
                slaDeadline,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                nextScheduleDate: nextScheduleDate ? new Date(nextScheduleDate) : null,
                warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null,
                estimatedCost: Number(estimatedCost) || 0,
                isRepeatIssue,
                repeatCount,
                parentIssueId: previous?.id ?? null,
                projectId,
            },
            include: { project: { select: { name: true, code: true } } },
        })
    );

    return NextResponse.json(record, { status: 201 });
});
