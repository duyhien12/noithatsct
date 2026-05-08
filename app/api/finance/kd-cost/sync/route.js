import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

// Contract types → revenue category
const TYPE_DESIGN    = ['Thiết kế'];
const TYPE_FURNITURE = ['Thi công', 'Thi công thô', 'Thi công hoàn thiện', 'Thi công + Nội thất', 'Thi công nội thất'];

function byMonth(records) {
    const months = {};
    let count = 0, total = 0;
    for (const { date, amount } of records) {
        if (!date || amount == null) continue;
        const m = new Date(date).getMonth() + 1;
        months[m] = (months[m] || 0) + (amount || 0);
        count++;
        total += amount || 0;
    }
    return { months, count, total: Math.round(total) };
}

// Build month→amount from MonthlyFixedCost for a single rowKey
function manualRow(manualCosts, rowKey) {
    const months = {};
    let total = 0;
    for (const r of manualCosts) {
        if (r.rowKey !== rowKey || !r.amount) continue;
        months[r.month] = (months[r.month] || 0) + r.amount;
        total += r.amount;
    }
    return { months, count: Object.keys(months).length, total: Math.round(total) };
}

// Convert MonthlyFixedCost entries for a rowKey into {date, amount} records for byMonth()
function manualAsRecords(manualCosts, rowKey, year) {
    return manualCosts
        .filter(r => r.rowKey === rowKey && r.amount > 0)
        .map(r => ({ date: new Date(year, r.month - 1, 1), amount: r.amount }));
}

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());
    const start = new Date(year, 0, 1);
    const end   = new Date(year + 1, 0, 1);

    const [
        cpDesign,
        cpFurniture,
        cpOther,
        contractorPay,
        purchaseOrders,
        expEntertain,
        expSupplies,
        expMarketing,
        expOther,
        rawManual,
    ] = await Promise.all([
        // ── DOANH THU (từ hợp đồng) ──────────────────────────────────────────
        prisma.contractPayment.findMany({
            where: {
                paidDate: { gte: start, lt: end },
                status: { in: ['Đã thu', 'Thu một phần'] },
                contract: { type: { in: TYPE_DESIGN } },
            },
            select: { paidDate: true, paidAmount: true },
        }),
        prisma.contractPayment.findMany({
            where: {
                paidDate: { gte: start, lt: end },
                status: { in: ['Đã thu', 'Thu một phần'] },
                contract: { type: { in: TYPE_FURNITURE } },
            },
            select: { paidDate: true, paidAmount: true },
        }),
        prisma.contractPayment.findMany({
            where: {
                paidDate: { gte: start, lt: end },
                status: { in: ['Đã thu', 'Thu một phần'] },
                contract: { type: { notIn: [...TYPE_DESIGN, ...TYPE_FURNITURE] } },
            },
            select: { paidDate: true, paidAmount: true },
        }),

        // ── CHI PHÍ TRỰC TIẾP (từ DB nội bộ) ────────────────────────────────
        prisma.contractorPayment.findMany({
            where: { paidAmount: { gt: 0 }, createdAt: { gte: start, lt: end } },
            select: { createdAt: true, paidAmount: true },
        }),
        prisma.purchaseOrder.findMany({
            where: { orderDate: { gte: start, lt: end } },
            select: { orderDate: true, totalAmount: true },
        }),
        prisma.projectExpense.findMany({
            where: {
                department: 'kinh_doanh',
                category: { in: ['Tiếp khách', 'Đối ngoại', 'Chi tiếp', 'Quà tặng', 'Chi tiếp khách'] },
                date: { gte: start, lt: end },
                status: { notIn: ['Từ chối'] },
            },
            select: { date: true, amount: true },
        }),
        prisma.projectExpense.findMany({
            where: {
                department: 'kinh_doanh',
                category: { in: ['Văn phòng phẩm', 'VPP', 'CCDC'] },
                date: { gte: start, lt: end },
                status: { notIn: ['Từ chối'] },
            },
            select: { date: true, amount: true },
        }),
        prisma.projectExpense.findMany({
            where: {
                category: { in: ['Marketing & Quảng cáo', 'Marketing', 'Quảng cáo'] },
                date: { gte: start, lt: end },
                status: { notIn: ['Từ chối'] },
            },
            select: { date: true, amount: true },
        }),
        prisma.projectExpense.findMany({
            where: {
                department: 'kinh_doanh',
                category: { in: ['Khác', 'Chi phí khác'] },
                date: { gte: start, lt: end },
                status: { notIn: ['Từ chối'] },
            },
            select: { date: true, amount: true },
        }),

        // ── NHẬP TAY (Lương & Chi phí cố định) ───────────────────────────────
        prisma.$queryRaw`
            SELECT "rowKey", month, amount
            FROM "MonthlyFixedCost"
            WHERE year = ${year}`,
    ]);

    // Normalize BigInt từ raw SQL → Number
    const manualCosts = rawManual.map(r => ({
        rowKey: r.rowKey,
        month:  Number(r.month),
        amount: Number(r.amount),
    }));

    const results = {
        // Doanh thu — từ hợp đồng
        rev_design:    { source: 'Hợp đồng Thiết kế đã thu tiền', ...byMonth(cpDesign.map(r => ({ date: r.paidDate, amount: r.paidAmount }))) },
        rev_furniture: { source: 'Hợp đồng Thi công / Nội thất đã thu tiền', ...byMonth(cpFurniture.map(r => ({ date: r.paidDate, amount: r.paidAmount }))) },
        rev_other:     { source: 'Hợp đồng loại khác đã thu tiền', ...byMonth(cpOther.map(r => ({ date: r.paidDate, amount: r.paidAmount }))) },

        // Chi phí trực tiếp — từ DB nội bộ
        direct_design_dept:  { source: 'Nhập tay — Lương & Phúc lợi Phòng Thiết kế', ...manualRow(manualCosts, 'direct_design_dept') },
        direct_factory:      { source: 'ContractorPayment — thanh toán nhà thầu/xưởng', ...byMonth(contractorPay.map(r => ({ date: r.createdAt, amount: r.paidAmount }))) },
        direct_order_other:  { source: 'PurchaseOrder — đơn mua sắm vật tư', ...byMonth(purchaseOrders.map(r => ({ date: r.orderDate, amount: r.totalAmount }))) },
        direct_entertain:    { source: 'Chi phí bộ phận KD — tiếp khách, đối ngoại', ...byMonth(expEntertain.map(r => ({ date: r.date, amount: r.amount }))) },
        direct_supplies:     { source: 'Chi phí bộ phận KD — văn phòng phẩm', ...byMonth(expSupplies.map(r => ({ date: r.date, amount: r.amount }))) },

        // Nhân công — nhập tay
        labor_salary:    { source: 'Nhập tay — Lương nhân viên KD', ...manualRow(manualCosts, 'labor_salary') },
        labor_insurance: { source: 'Nhập tay — BHXH / BHYT toàn công ty', ...manualRow(manualCosts, 'labor_insurance') },
        labor_bonus:     { source: 'Nhập tay — Thưởng & Phúc lợi KD', ...manualRow(manualCosts, 'labor_bonus') },

        // Quản lý — nhập tay
        mgmt_salary: { source: 'Nhập tay — Lương NVQL', ...manualRow(manualCosts, 'mgmt_salary') },
        mgmt_bonus:  { source: 'Nhập tay — Thưởng doanh số NVQL', ...manualRow(manualCosts, 'mgmt_bonus') },

        // Chi phí gián tiếp — nhập tay + ProjectExpense
        indirect_marketing: {
            source: 'Nhập tay + Chi phí bộ phận — Marketing & Quảng cáo',
            ...byMonth([
                ...manualAsRecords(manualCosts, 'indirect_marketing', year),
                ...expMarketing.map(r => ({ date: r.date, amount: r.amount })),
            ]),
        },
        indirect_general:    { source: 'Nhập tay — Chi phí chung (điện, thuê nhà, xăng...)', ...manualRow(manualCosts, 'indirect_general') },
        indirect_equipment:  { source: 'Nhập tay — Máy móc, CCDC, Đầu tư', ...manualRow(manualCosts, 'indirect_equipment') },
        indirect_renovation: { source: 'Nhập tay — Sửa chữa, nâng cấp showroom', ...manualRow(manualCosts, 'indirect_renovation') },
        indirect_other: {
            source: 'Nhập tay + Chi phí bộ phận KD — Chi phí khác',
            ...byMonth([
                ...manualAsRecords(manualCosts, 'indirect_other', year),
                ...expOther.map(r => ({ date: r.date, amount: r.amount })),
            ]),
        },
    };

    return Response.json({ year, results });
});
