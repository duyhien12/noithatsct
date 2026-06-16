import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const steps = await prisma.productionPlanStep.findMany({
        orderBy: [{ deadline: 'asc' }],
        select: {
            id: true, name: true, deadline: true, completed: true,
            completedAt: true, completedBy: true,
            stage: {
                select: {
                    key: true, name: true, sortOrder: true,
                    plan: {
                        select: {
                            project: {
                                select: {
                                    id: true, code: true, name: true,
                                    productionOrders: { select: { id: true }, take: 1 },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    const now = new Date();
    const rows = steps.map(s => ({
        id: s.id,
        name: s.name,
        deadline: s.deadline,
        completed: s.completed,
        completedAt: s.completedAt,
        completedBy: s.completedBy,
        overdue: !s.completed && s.deadline && s.deadline < now,
        stageKey: s.stage.key,
        stageName: s.stage.name,
        projectId: s.stage.plan.project.id,
        projectCode: s.stage.plan.project.code,
        projectName: s.stage.plan.project.name,
        orderId: s.stage.plan.project.productionOrders[0]?.id || null,
    }));

    return NextResponse.json(rows);
});
