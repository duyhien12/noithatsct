import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { buildItemsForTemplate, SUPERVISION_CHECKLIST_TEMPLATES } from '@/lib/supervisionChecklistTemplates';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const checklists = await prisma.supervisionChecklist.findMany({
        where: {
            deletedAt: null,
            ...(projectId ? { projectId } : {}),
            ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
            project: { select: { id: true, code: true, name: true } },
            items: { select: { status: true } },
        },
    });

    const withProgress = checklists.map(c => {
        const total = c.items.length;
        const checked = c.items.filter(i => i.status !== 'pending').length;
        const fail = c.items.filter(i => i.status === 'fail').length;
        const { items, ...rest } = c;
        return { ...rest, total, checked, fail };
    });

    return NextResponse.json(withProgress);
});

export const POST = withAuth(async (request, context, session) => {
    const { projectId, templateKey } = await request.json();
    if (!projectId || !templateKey) {
        return NextResponse.json({ error: 'projectId và templateKey là bắt buộc' }, { status: 400 });
    }

    const template = SUPERVISION_CHECKLIST_TEMPLATES[templateKey];
    if (!template) return NextResponse.json({ error: 'Mẫu checklist không hợp lệ' }, { status: 400 });

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });

    const items = buildItemsForTemplate(templateKey);

    const checklist = await prisma.supervisionChecklist.create({
        data: {
            projectId,
            templateKey,
            templateName: template.name,
            createdBy: session?.user?.name || '',
            items: { create: items },
        },
        include: { project: { select: { id: true, code: true, name: true } } },
    });

    return NextResponse.json(checklist, { status: 201 });
});
