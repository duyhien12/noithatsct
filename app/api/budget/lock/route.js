import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST: Khóa dự toán — copy unitPrice → budgetUnitPrice, set isLocked
export const POST = withAuth(async (request) => {
    const { projectId, lockedBy = '' } = await request.json();
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.budgetStatus === 'locked') return NextResponse.json({ error: 'Dự toán đã được khóa' }, { status: 400 });

    // Get all material plans for this project
    const plans = await prisma.materialPlan.findMany({ where: { projectId } });
    if (plans.length === 0) return NextResponse.json({ error: 'Chưa có vật tư trong dự toán' }, { status: 400 });

    // Lock each plan: copy unitPrice → budgetUnitPrice, set isLocked = true
    const updates = plans.map(p =>
        prisma.materialPlan.update({
            where: { id: p.id },
            data: {
                budgetUnitPrice: p.unitPrice,
                isLocked: true,
            },
        })
    );

    // Calculate budget total
    const budgetTotal = plans.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);

    // Update project status
    const projectUpdate = prisma.project.update({
        where: { id: projectId },
        data: {
            budgetStatus: 'locked',
            budgetLockedAt: new Date(),
            budgetLockedBy: lockedBy,
            budgetTotal,
        },
    });

    await prisma.$transaction([...updates, projectUpdate]);

    return NextResponse.json({ success: true, budgetTotal, lockedPlans: plans.length });
});

// DELETE: Mở khóa dự toán
export const DELETE = withAuth(async (request, context, session) => {
    const { projectId } = await request.json();
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.budgetStatus !== 'locked') return NextResponse.json({ error: 'Dự toán chưa được khóa' }, { status: 400 });

    // Unlock all material plans
    await prisma.materialPlan.updateMany({
        where: { projectId },
        data: { isLocked: false },
    });

    // Reset project budget status
    await prisma.project.update({
        where: { id: projectId },
        data: {
            budgetStatus: 'draft',
            budgetLockedAt: null,
            budgetLockedBy: '',
        },
    });

    const unlockedBy = session?.user?.name || 'Admin';
    return NextResponse.json({ success: true, unlockedBy });
});
