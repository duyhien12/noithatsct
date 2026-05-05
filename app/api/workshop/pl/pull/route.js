import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

// Map chi phí xưởng category → P&L entry type
const EXPENSE_MAP = {
    'Vật tư gỗ & ván':    'DIRECT_MATERIAL',
    'Phụ kiện nội thất':  'DIRECT_MATERIAL',
    'Sơn & hoàn thiện':   'DIRECT_MATERIAL',
    'Công thợ xưởng':     'DIRECT_LABOR_SALARY',
    'Chi phí vận chuyển': 'DIRECT_OUTSOURCE',
    'Điện nước xưởng':    'INDIRECT_ELECTRIC',
    'Thuê máy móc':       'INDIRECT_EQUIPMENT',
    'Chi phí chung':      'INDIRECT_OTHER',
    'Khác':               'INDIRECT_OTHER',
};

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7);
    const [y, m] = period.split('-').map(Number);
    const from = new Date(y, m - 1, 1);
    const to   = new Date(y, m, 1);

    const suggestions = [];

    // ── 1. Doanh thu ngoài: ContractPayments dự án Thi công nội thất ────────
    try {
        const payments = await prisma.contractPayment.findMany({
            where: {
                paidDate: { gte: from, lt: to },
                paidAmount: { gt: 0 },
                contract: { project: { type: 'Thi công nội thất' } },
            },
            include: {
                contract: {
                    include: {
                        customer: { select: { name: true } },
                        project:  { select: { name: true, type: true } },
                    },
                },
            },
        });
        for (const p of payments) {
            suggestions.push({
                entryType: 'REVENUE_EXTERNAL',
                description: `Thu ${p.contract?.code || 'HĐ'} — ${p.contract?.customer?.name || 'Khách hàng'}`,
                amount: p.paidAmount,
                notes: `Dự án: ${p.contract?.project?.name || ''}. Tổng HĐ: ${(p.contract?.contractValue || 0).toLocaleString('vi-VN')}đ`,
                source: 'Hợp đồng NT',
            });
        }
    } catch (_) {}

    // ── 2. Doanh thu nội bộ: Thu tiền xưởng (category Nội thất) ─────────────
    try {
        const incomes = await prisma.projectExpense.findMany({
            where: {
                date: { gte: from, lt: to },
                department: 'xuong',
                expenseType: 'Thu tiền',
                category: 'Nội thất',
            },
        });
        for (const inc of incomes) {
            if ((inc.amount || 0) <= 0) continue;
            suggestions.push({
                entryType: 'REVENUE_INTERNAL',
                description: inc.description || 'Thu tiền nội thất',
                amount: inc.amount,
                notes: `Thu tiền xưởng`,
                source: 'Thu tiền xưởng',
            });
        }
    } catch (_) {}

    // ── 2. Vật tư: PurchaseOrders nhận trong kỳ ─────────────────────────────
    try {
        const pos = await prisma.purchaseOrder.findMany({
            where: {
                status: { in: ['Đã nhận', 'Đã phê duyệt'] },
                OR: [
                    { receivedDate: { gte: from, lt: to } },
                    { receivedDate: null, orderDate: { gte: from, lt: to } },
                ],
            },
        });
        for (const po of pos) {
            if ((po.totalAmount || 0) <= 0) continue;
            suggestions.push({
                entryType: 'DIRECT_MATERIAL',
                description: `Mua sắm vật tư${po.code ? ` — ${po.code}` : ''}`,
                amount: po.totalAmount,
                notes: `Trạng thái: ${po.status}`,
                source: 'Mua sắm',
            });
        }
    } catch (_) {}

    // ── 3. Lương nhân công: Attendance trong kỳ ─────────────────────────────
    try {
        const attendances = await prisma.workshopAttendance.findMany({
            where: { date: { gte: from, lt: to } },
            include: { worker: { select: { hourlyRate: true } } },
        });
        // hourlyRate là đơn giá ngày; hoursWorked/8 là tỷ lệ ngày công
        const laborSalary = attendances.reduce((s, a) => s + ((a.hoursWorked / 8) * (a.worker?.hourlyRate || 0)), 0);
        const workerCount = new Set(attendances.map(a => a.workerId)).size;
        if (laborSalary > 0) {
            suggestions.push({
                entryType: 'DIRECT_LABOR_SALARY',
                description: `Lương nhân công xưởng tháng ${m}/${y}`,
                amount: Math.round(laborSalary),
                notes: `${attendances.length} lượt chấm công / ${workerCount} thợ`,
                source: 'Chấm công',
            });
        }
    } catch (_) {}

    // ── 4. Tăng ca đã duyệt ─────────────────────────────────────────────────
    try {
        const overtimes = await prisma.workerOvertime.findMany({
            where: { date: { gte: from, lt: to }, status: 'Đã duyệt' },
        });
        const overtimePay = overtimes.reduce((s, o) => s + (o.totalPay || 0), 0);
        if (overtimePay > 0) {
            suggestions.push({
                entryType: 'DIRECT_LABOR_SALARY',
                description: `Phụ cấp tăng ca tháng ${m}/${y}`,
                amount: Math.round(overtimePay),
                notes: `${overtimes.length} ca tăng ca (đã duyệt)`,
                source: 'Chấm công',
            });
        }
    } catch (_) {}

    // ── 5. Chi phí xưởng đã duyệt → map sang loại P&L ───────────────────────
    try {
        const expenses = await prisma.projectExpense.findMany({
            where: {
                date: { gte: from, lt: to },
                department: 'xuong',
                expenseType: { not: 'Thu tiền' },   // loại trừ thu tiền (đã xử lý ở block doanh thu)
                status: { in: ['Đã duyệt', 'Đã chi', 'Hoàn thành'] },
            },
        });
        for (const exp of expenses) {
            if ((exp.amount || 0) <= 0) continue;
            suggestions.push({
                entryType: EXPENSE_MAP[exp.category] || 'INDIRECT_OTHER',
                description: exp.description || exp.category,
                amount: exp.amount,
                notes: `Chi phí xưởng — ${exp.category}`,
                source: 'Chi phí xưởng',
            });
        }
    } catch (_) {}

    // ── 6. Khấu hao TSCĐ (tính theo tháng) ─────────────────────────────────
    try {
        const assets = await prisma.fixedAsset.findMany({
            where: { status: 'Đang dùng', depreciationRate: { gt: 0 } },
        });
        const monthlyDep = assets.reduce((s, a) => {
            if (!a.startUseDate) return s;
            if (new Date(a.startUseDate) > to) return s;
            return s + (a.originalCost * a.depreciationRate) / 100 / 12;
        }, 0);
        if (monthlyDep > 0) {
            const activeCount = assets.filter(a => a.startUseDate && new Date(a.startUseDate) <= to).length;
            suggestions.push({
                entryType: 'INDIRECT_DEPRECIATION',
                description: `Khấu hao TSCĐ tháng ${m}/${y}`,
                amount: Math.round(monthlyDep),
                notes: `${activeCount} tài sản đang khấu hao`,
                source: 'Tài sản CĐ',
            });
        }
    } catch (_) {}

    return NextResponse.json({ suggestions, period });
});
