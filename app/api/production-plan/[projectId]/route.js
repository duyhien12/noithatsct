import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { PRODUCTION_PLAN_TEMPLATE } from '@/lib/productionPlanTemplate';

const PLAN_INCLUDE = {
    stages: {
        orderBy: { sortOrder: 'asc' },
        include: {
            steps: { orderBy: { sortOrder: 'asc' } },
        },
    },
};

export const GET = withAuth(async (req, { params }) => {
    const { projectId } = await params;

    let plan = await prisma.productionPlan.findUnique({
        where: { projectId },
        include: PLAN_INCLUDE,
    });

    if (!plan) {
        plan = await prisma.productionPlan.create({
            data: {
                projectId,
                stages: {
                    create: PRODUCTION_PLAN_TEMPLATE.map((stage, stageIdx) => ({
                        key: stage.key,
                        name: stage.name,
                        sortOrder: stageIdx,
                        steps: {
                            create: stage.steps.map((stepName, stepIdx) => ({
                                name: stepName,
                                sortOrder: stepIdx,
                            })),
                        },
                    })),
                },
            },
            include: PLAN_INCLUDE,
        });
    }

    const order = await prisma.productionOrder.findFirst({ where: { projectId }, select: { id: true } });

    return NextResponse.json({ ...plan, orderId: order?.id || null });
});
