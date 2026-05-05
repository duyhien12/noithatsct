import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

const REVENUE_TYPES  = ['REVENUE_INTERNAL', 'REVENUE_EXTERNAL'];
const DIRECT_TYPES   = ['DIRECT_MATERIAL', 'DIRECT_LABOR_SALARY', 'DIRECT_LABOR_INSURANCE', 'DIRECT_LABOR_BONUS', 'DIRECT_LABOR_MEAL', 'DIRECT_OUTSOURCE'];
const INDIRECT_TYPES = ['INDIRECT_MGMT_SALARY', 'INDIRECT_MGMT_INSURANCE', 'INDIRECT_MGMT_BONUS', 'INDIRECT_MGMT_MEAL', 'INDIRECT_OFFICE_MACHINE', 'INDIRECT_OFFICE_TOOLS', 'INDIRECT_ELECTRIC', 'INDIRECT_EQUIPMENT', 'INDIRECT_MAINTENANCE', 'INDIRECT_DEPRECIATION', 'INDIRECT_OTHER'];

export const GET = withAuth(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Last 7 days for chart
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    const [
        activeWorkers,
        inProgressTasks,
        overdueTasks,
        allProducts,
        todayAttendance,
        recentTasks,
        projectsInProgress,
        lowStockProducts,
        tasksByDay,
        workerTaskCounts,
        plEntries,
    ] = await Promise.all([
        // Nhân công đang hoạt động
        prisma.workshopWorker.count({ where: { status: 'Hoạt động' } }),

        // Công việc đang làm
        prisma.workshopTask.count({ where: { status: 'Đang làm' } }),

        // Công việc trễ deadline
        prisma.workshopTask.count({
            where: {
                deadline: { lt: now },
                status: { notIn: ['Hoàn thành'] },
            },
        }),

        // Tất cả vật tư (để tính giá trị tồn kho)
        prisma.product.findMany({
            where: { deletedAt: null, stock: { gt: 0 } },
            select: { stock: true, importPrice: true, minStock: true },
        }),

        // Chấm công hôm nay
        prisma.workshopAttendance.findMany({
            where: { date: { gte: todayStart, lt: todayEnd } },
            include: { worker: { select: { hourlyRate: true } } },
        }),

        // Công việc gần đây
        prisma.workshopTask.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 8,
            include: {
                project: { select: { id: true, code: true, name: true } },
                workers: { include: { worker: { select: { id: true, name: true } } } },
            },
        }),

        // Dự án đang thi công
        prisma.project.findMany({
            where: { status: { in: ['Thi công', 'Đang thực hiện', 'Khởi công'] } },
            orderBy: { updatedAt: 'desc' },
            take: 6,
            select: { id: true, code: true, name: true, progress: true, endDate: true },
        }),

        // Vật tư sắp hết
        prisma.product.findMany({
            where: { deletedAt: null, stock: { lte: prisma.product.fields?.minStock || 5 } },
            orderBy: { stock: 'asc' },
            take: 5,
            select: { id: true, name: true, stock: true, minStock: true, unit: true },
        }),

        // Tasks 7 ngày gần đây (để vẽ chart)
        prisma.workshopTask.findMany({
            where: { createdAt: { gte: days[0] } },
            select: { createdAt: true, status: true, deadline: true },
        }),

        // Top workers theo số task
        prisma.workshopTaskWorker.groupBy({
            by: ['workerId'],
            _count: true,
            orderBy: { _count: { workerId: 'desc' } },
            take: 5,
        }),

        // P&L tháng hiện tại
        prisma.workshopPLEntry.findMany({
            where: { period: currentPeriod },
            select: { entryType: true, amount: true },
        }),
    ]);

    // Tính giá trị tồn kho
    const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.stock * p.importPrice), 0);
    const lowStockCount = allProducts.filter(p => p.minStock > 0 && p.stock <= p.minStock).length;

    // Tính chi phí xưởng hôm nay
    const todayCost = todayAttendance.reduce(
        (sum, a) => sum + (a.hoursWorked * (a.worker?.hourlyRate || 0)), 0
    );

    // Tính tasks theo ngày cho chart (7 ngày)
    const chartData = days.map(day => {
        const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
        const dayTasks = tasksByDay.filter(t => t.createdAt >= day && t.createdAt < nextDay);
        const done = tasksByDay.filter(t => t.status === 'Hoàn thành' && t.createdAt >= day && t.createdAt < nextDay).length;
        return {
            dateISO: day.toISOString(),
            total: dayTasks.length,
            done,
            overdue: dayTasks.filter(t => t.deadline && t.deadline < nextDay && t.status !== 'Hoàn thành').length,
        };
    });

    // Tính P&L tháng hiện tại
    const sumType = (types) => plEntries.filter(e => types.includes(e.entryType)).reduce((s, e) => s + e.amount, 0);
    const plRevenue      = sumType(REVENUE_TYPES);
    const plDirectCosts  = sumType(DIRECT_TYPES);
    const plGrossProfit  = plRevenue - plDirectCosts;
    const plIndirectCosts= sumType(INDIRECT_TYPES);
    const plNetProfit    = plGrossProfit - plIndirectCosts;

    return Response.json({
        kpi: {
            activeWorkers,
            inProgressTasks,
            overdueTasks,
            totalInventoryValue,
            todayCost,
            lowStockCount,
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
    });
});
