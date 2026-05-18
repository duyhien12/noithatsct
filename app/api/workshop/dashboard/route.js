import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

const REVENUE_TYPES  = ['REVENUE_INTERNAL', 'REVENUE_EXTERNAL'];
const DIRECT_TYPES   = ['DIRECT_MATERIAL', 'DIRECT_LABOR_SALARY', 'DIRECT_LABOR_INSURANCE', 'DIRECT_LABOR_BONUS', 'DIRECT_LABOR_MEAL', 'DIRECT_OUTSOURCE'];
const INDIRECT_TYPES = ['INDIRECT_MGMT_SALARY', 'INDIRECT_MGMT_INSURANCE', 'INDIRECT_MGMT_BONUS', 'INDIRECT_MGMT_MEAL', 'INDIRECT_OFFICE_MACHINE', 'INDIRECT_OFFICE_TOOLS', 'INDIRECT_ELECTRIC', 'INDIRECT_EQUIPMENT', 'INDIRECT_MAINTENANCE', 'INDIRECT_DEPRECIATION', 'INDIRECT_OTHER'];
const STAGES = ['Cut', 'CNC', 'Edge', 'Paint', 'Assembly', 'QC'];

export const GET = withAuth(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    const [
        activeWorkersCount,
        inProgressTasks,
        overdueTasks,
        blockedTasksCount,
        allProducts,
        todayAttendance,
        recentTasks,
        projectsInProgress,
        tasksByDay,
        plEntries,
        stageTaskCounts,
        stageBlockedCounts,
        taskMaterialDemand,
        equipmentAlerts,
    ] = await Promise.all([
        prisma.workshopWorker.count({ where: { status: 'Hoạt động' } }),

        prisma.workshopTask.count({ where: { status: 'Đang làm' } }),

        prisma.workshopTask.count({
            where: { deadline: { lt: now }, status: { notIn: ['Hoàn thành'] } },
        }),

        prisma.workshopTask.count({
            where: { status: 'Tạm dừng', blockedReason: { not: '' } },
        }),

        // All products for inventory calculations (fixed: client-side filter for lowStock)
        prisma.product.findMany({
            where: { deletedAt: null },
            select: { id: true, name: true, stock: true, minStock: true, unit: true, importPrice: true },
        }),

        prisma.workshopAttendance.findMany({
            where: { date: { gte: todayStart, lt: todayEnd } },
            include: { worker: { select: { hourlyRate: true } } },
        }),

        prisma.workshopTask.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 8,
            include: {
                project: { select: { id: true, code: true, name: true } },
                workers: { include: { worker: { select: { id: true, name: true } } } },
            },
        }),

        prisma.project.findMany({
            where: { status: { in: ['Thi công', 'Đang thực hiện', 'Khởi công'] } },
            orderBy: { updatedAt: 'desc' },
            take: 6,
            select: {
                id: true, code: true, name: true, progress: true,
                endDate: true, contractValue: true, budget: true, spent: true,
            },
        }),

        prisma.workshopTask.findMany({
            where: { createdAt: { gte: days[0] } },
            select: { createdAt: true, status: true, deadline: true },
        }),

        prisma.workshopPLEntry.findMany({
            where: { period: currentPeriod },
            select: { entryType: true, amount: true },
        }),

        // Stage pipeline: count active tasks per stage
        prisma.workshopTask.groupBy({
            by: ['stage'],
            where: { status: { not: 'Hoàn thành' } },
            _count: { id: true },
        }),

        // Blocked tasks per stage
        prisma.workshopTask.groupBy({
            by: ['stage'],
            where: { status: 'Tạm dừng', blockedReason: { not: '' } },
            _count: { id: true },
        }),

        // Materials needed by active tasks (for inventory forecast)
        prisma.workshopTaskMaterial.groupBy({
            by: ['productId'],
            where: { task: { status: { notIn: ['Hoàn thành'] } } },
            _sum: { quantity: true },
        }),

        // Equipment needing attention
        prisma.fixedAsset.findMany({
            where: {
                OR: [
                    { status: { notIn: ['Đang dùng', 'Đã thanh lý'] } },
                    { status: 'Đang dùng', wearRate: { gte: 80 } },
                ],
            },
            take: 5,
            orderBy: { wearRate: 'desc' },
            select: { id: true, code: true, name: true, status: true, wearRate: true, assetType: true },
        }),
    ]);

    // Idle workers: active workers with no 'Đang làm' task assigned
    const busyWorkerRows = await prisma.workshopTaskWorker.findMany({
        where: { task: { status: 'Đang làm' } },
        select: { workerId: true },
        distinct: ['workerId'],
    });
    const busyIds = busyWorkerRows.map(r => r.workerId);
    const idleWorkers = await prisma.workshopWorker.findMany({
        where: { status: 'Hoạt động', id: { notIn: busyIds.length > 0 ? busyIds : ['__none__'] } },
        select: { id: true, name: true, skill: true },
    });

    // --- Derived values ---
    const totalInventoryValue = allProducts.reduce((sum, p) => sum + p.stock * p.importPrice, 0);
    const lowStockProducts = allProducts
        .filter(p => p.minStock > 0 && p.stock <= p.minStock)
        .sort((a, b) => (a.stock / Math.max(a.minStock, 1)) - (b.stock / Math.max(b.minStock, 1)))
        .slice(0, 5);
    const lowStockCount = allProducts.filter(p => p.minStock > 0 && p.stock <= p.minStock).length;

    const todayCost = todayAttendance.reduce((sum, a) => sum + a.hoursWorked * (a.worker?.hourlyRate || 0), 0);

    // Chart
    const chartData = days.map(day => {
        const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
        const dayTasks = tasksByDay.filter(t => t.createdAt >= day && t.createdAt < nextDay);
        return {
            dateISO: day.toISOString(),
            total: dayTasks.length,
            done: dayTasks.filter(t => t.status === 'Hoàn thành').length,
            overdue: dayTasks.filter(t => t.deadline && t.deadline < nextDay && t.status !== 'Hoàn thành').length,
        };
    });

    // P&L
    const sumType = (types) => plEntries.filter(e => types.includes(e.entryType)).reduce((s, e) => s + e.amount, 0);
    const plRevenue       = sumType(REVENUE_TYPES);
    const plDirectCosts   = sumType(DIRECT_TYPES);
    const plGrossProfit   = plRevenue - plDirectCosts;
    const plIndirectCosts = sumType(INDIRECT_TYPES);
    const plNetProfit     = plGrossProfit - plIndirectCosts;

    // Stage pipeline with bottleneck info
    const stageCountMap   = Object.fromEntries(stageTaskCounts.map(s => [s.stage, s._count.id]));
    const stageBlockedMap = Object.fromEntries(stageBlockedCounts.map(s => [s.stage, s._count.id]));
    const stagePipeline   = STAGES.map(s => ({
        stage: s,
        count: stageCountMap[s] || 0,
        blocked: stageBlockedMap[s] || 0,
    }));

    // Inventory forecast: tasks need materials vs. current stock
    const productMap = Object.fromEntries(allProducts.map(p => [p.id, p]));
    const inventoryForecast = taskMaterialDemand
        .map(m => {
            const p = productMap[m.productId];
            if (!p) return null;
            const needed = m._sum.quantity || 0;
            const shortage = Math.max(0, needed - p.stock);
            return { productId: m.productId, name: p.name, unit: p.unit, stock: p.stock, needed, shortage, sufficient: shortage === 0 };
        })
        .filter(Boolean)
        .sort((a, b) => b.shortage - a.shortage)
        .slice(0, 8);

    return Response.json({
        kpi: {
            activeWorkers: activeWorkersCount,
            inProgressTasks,
            overdueTasks,
            blockedTasksCount,
            totalInventoryValue,
            todayCost,
            lowStockCount,
            idleWorkersCount: idleWorkers.length,
        },
        plSummary: {
            period: currentPeriod,
            revenue: plRevenue,
            directCosts: plDirectCosts,
            grossProfit: plGrossProfit,
            indirectCosts: plIndirectCosts,
            netProfit: plNetProfit,
            entryCount: plEntries.length,
        },
        chartData,
        recentTasks,
        projectsInProgress,
        lowStockProducts,
        todayAttendanceCount: todayAttendance.length,
        stagePipeline,
        idleWorkers,
        inventoryForecast,
        equipmentAlerts,
    });
});
