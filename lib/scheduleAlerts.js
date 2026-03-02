import prisma from '@/lib/prisma';

/**
 * Check for material alerts related to upcoming schedule tasks.
 * If a task starts within `daysAhead` days, cross-check MaterialPlan
 * to see if materials have been ordered/received.
 * 
 * Returns: [{ taskId, taskName, startDate, alerts: [{ type, message, productName }] }]
 */
export async function getScheduleAlerts(projectId, daysAhead = 2) {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + daysAhead);

    // Tasks starting within daysAhead
    const upcomingTasks = await prisma.scheduleTask.findMany({
        where: {
            projectId,
            status: { not: 'Hoàn thành' },
            startDate: { lte: deadline, gte: now },
            parentId: { not: null }, // Only leaf tasks (children)
        },
        orderBy: { startDate: 'asc' },
    });

    if (upcomingTasks.length === 0) return [];

    // Get all material plans for this project
    const materials = await prisma.materialPlan.findMany({
        where: { projectId },
        include: { product: { select: { name: true, code: true } } },
    });

    const alerts = [];
    for (const task of upcomingTasks) {
        const taskAlerts = [];
        const taskNameLower = task.name.toLowerCase();

        // Basic keyword matching: check if any material name relates to task name
        for (const mat of materials) {
            const productName = mat.product?.name?.toLowerCase() || '';
            const keywords = taskNameLower.split(/[\s,]+/).filter(w => w.length > 2);

            const isRelated = keywords.some(kw =>
                productName.includes(kw) || kw.includes(productName.split(' ')[0])
            );

            if (isRelated) {
                if (mat.status === 'Chưa đặt') {
                    taskAlerts.push({
                        type: 'danger',
                        message: `Chưa đặt hàng`,
                        productName: mat.product?.name,
                        productCode: mat.product?.code,
                    });
                } else if (mat.receivedQty < mat.quantity) {
                    taskAlerts.push({
                        type: 'warning',
                        message: `Đã đặt nhưng chưa nhận đủ (${mat.receivedQty}/${mat.quantity})`,
                        productName: mat.product?.name,
                        productCode: mat.product?.code,
                    });
                }
            }
        }

        if (taskAlerts.length > 0) {
            alerts.push({
                taskId: task.id,
                taskName: task.name,
                startDate: task.startDate,
                alerts: taskAlerts,
            });
        }
    }

    return alerts;
}
