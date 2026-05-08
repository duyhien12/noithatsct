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
        larkSalaryKD,
        larkInsurance,
        larkBonus,
        larkDesignDept,
        larkSalaryQLC,
        larkBonusQLC,
        larkMarketing,
        expMarketing,
        larkGeneral,
        larkEquipment,
        larkRenovation,
        larkOther,
        expOther,
    ] = await Promise.all([
        // ── REVENUE ──────────────────────────────────────────────────────────
        // Doanh thu nhận thiết kế
        prisma.contractPayment.findMany({
            where: {
                paidDate: { gte: start, lt: end },
                status: { in: ['Đã thu', 'Thu một phần'] },
                contract: { type: { in: TYPE_DESIGN } },
            },
            select: { paidDate: true, paidAmount: true },
        }),
        // Doanh thu hợp đồng nội thất
        prisma.contractPayment.findMany({
            where: {
                paidDate: { gte: start, lt: end },
                status: { in: ['Đã thu', 'Thu một phần'] },
                contract: { type: { in: TYPE_FURNITURE } },
            },
            select: { paidDate: true, paidAmount: true },
        }),
        // Doanh thu khác (chưa phân loại được type)
        prisma.contractPayment.findMany({
            where: {
                paidDate: { gte: start, lt: end },
                status: { in: ['Đã thu', 'Thu một phần'] },
                contract: { type: { notIn: [...TYPE_DESIGN, ...TYPE_FURNITURE] } },
            },
            select: { paidDate: true, paidAmount: true },
        }),

        // ── CHI PHÍ TRỰC TIẾP ────────────────────────────────────────────────
        // Trả xưởng sản xuất (ContractorPayment đã thanh toán)
        prisma.contractorPayment.findMany({
            where: { paidAmount: { gt: 0 }, createdAt: { gte: start, lt: end } },
            select: { createdAt: true, paidAmount: true },
        }),
        // Chi phí đặt hàng khác (PurchaseOrder)
        prisma.purchaseOrder.findMany({
            where: { orderDate: { gte: start, lt: end } },
            select: { orderDate: true, totalAmount: true },
        }),
        // Chi phí tiếp khác / đối ngoại (ProjectExpense - KD dept)
        prisma.projectExpense.findMany({
            where: {
                department: 'kinh_doanh',
                category: { in: ['Tiếp khách', 'Đối ngoại', 'Chi tiếp', 'Quà tặng', 'Chi tiếp khách'] },
                date: { gte: start, lt: end },
                status: { notIn: ['Từ chối'] },
            },
            select: { date: true, amount: true },
        }),
        // Văn phòng phẩm (ProjectExpense + Lark VPP)
        prisma.projectExpense.findMany({
            where: {
                department: 'kinh_doanh',
                category: { in: ['Văn phòng phẩm', 'VPP', 'CCDC'] },
                date: { gte: start, lt: end },
                status: { notIn: ['Từ chối'] },
            },
            select: { date: true, amount: true },
        }),

        // ── NHÂN CÔNG ────────────────────────────────────────────────────────
        // Lương sale (Lark - chỉ dept KD)
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['T/ứng lương', 'Lương', 'Chi lương'] },
                department: 'KD',
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // BHXH, BHYT (toàn công ty — sẽ chia đều theo phòng ban nếu cần)
        prisma.larkJournalEntry.findMany({
            where: {
                category: 'BHXH',
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // Thưởng, phúc lợi nhân viên KD
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['Thưởng NS', 'Phúc lợi'] },
                department: 'KD',
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),

        // Trả Phòng Thiết kế (Lark - TK + TKNT dept lương/phúc lợi)
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['T/ứng lương', 'Lương', 'Chi lương', 'Phúc lợi', 'Thưởng NS'] },
                department: { in: ['TK', 'TKNT'] },
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),

        // ── GIÁN TIẾP ────────────────────────────────────────────────────────
        // Lương NVQL (Lark - QLC dept)
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['T/ứng lương', 'Lương', 'Chi lương'] },
                department: 'QLC',
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // Thưởng doanh số NVQL
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['Thưởng NS', 'Phúc lợi'] },
                department: 'QLC',
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // Marketing / Quảng cáo (Lark)
        prisma.larkJournalEntry.findMany({
            where: {
                OR: [
                    { category: { in: ['Quảng cáo', 'CP đào tạo', 'app'] } },
                    { department: 'MKT' },
                ],
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // Marketing (ProjectExpense)
        prisma.projectExpense.findMany({
            where: {
                category: { in: ['Marketing & Quảng cáo', 'Marketing', 'Quảng cáo'] },
                date: { gte: start, lt: end },
                status: { notIn: ['Từ chối'] },
            },
            select: { date: true, amount: true },
        }),
        // Chi phí chung (điện, nước, thuê nhà, xăng...)
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['CP chung', 'Điện sáng', 'Internet', 'Điện thoại', 'Thuê nhà', 'Xăng xe', 'Gửi hồ sơ', 'Sửa xe'] },
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // Mua sắm máy móc
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['Máy móc', 'CCDC', 'Đầu tư XNT'] },
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // Sửa chữa showroom
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['Sửa chữa', 'Sửa chữa MM'] },
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // Chi phí khác (Lark)
        prisma.larkJournalEntry.findMany({
            where: {
                category: { in: ['Chi phí khác', 'Chi riêng', 'Công tác'] },
                entryDate: { gte: start, lt: end },
            },
            select: { entryDate: true, cashOut: true, bankOut: true },
        }),
        // Chi phí khác (ProjectExpense KD)
        prisma.projectExpense.findMany({
            where: {
                department: 'kinh_doanh',
                category: { in: ['Khác', 'Chi phí khác'] },
                date: { gte: start, lt: end },
                status: { notIn: ['Từ chối'] },
            },
            select: { date: true, amount: true },
        }),
    ]);

    // Helper: Lark cashOut + bankOut
    const larkOut = (rows) => rows.map(r => ({ date: r.entryDate, amount: (r.cashOut || 0) + (r.bankOut || 0) }));

    const results = {
        rev_design:    { source: 'Hợp đồng Thiết kế đã thu tiền', ...byMonth(cpDesign.map(r => ({ date: r.paidDate, amount: r.paidAmount }))) },
        rev_furniture: { source: 'Hợp đồng Thi công / Nội thất đã thu tiền', ...byMonth(cpFurniture.map(r => ({ date: r.paidDate, amount: r.paidAmount }))) },
        rev_other:     { source: 'Hợp đồng loại khác đã thu tiền', ...byMonth(cpOther.map(r => ({ date: r.paidDate, amount: r.paidAmount }))) },

        direct_design_dept:  { source: 'Lark — T/ứng lương + Phúc lợi (dept: TK, TKNT)', ...byMonth(larkOut(larkDesignDept)) },
        direct_factory:      { source: 'ContractorPayment — thanh toán nhà thầu/xưởng', ...byMonth(contractorPay.map(r => ({ date: r.createdAt, amount: r.paidAmount }))) },
        direct_order_other:  { source: 'PurchaseOrder — đơn mua sắm vật tư', ...byMonth(purchaseOrders.map(r => ({ date: r.orderDate, amount: r.totalAmount }))) },
        direct_entertain:    { source: 'Chi phí bộ phận KD — tiếp khách, đối ngoại', ...byMonth(expEntertain.map(r => ({ date: r.date, amount: r.amount }))) },
        direct_supplies:     { source: 'Lark VPP + Chi phí bộ phận KD — văn phòng phẩm', ...byMonth(expSupplies.map(r => ({ date: r.date, amount: r.amount }))) },

        labor_salary:    { source: 'Lark — T/ứng lương (dept: KD)', ...byMonth(larkOut(larkSalaryKD)) },
        labor_insurance: { source: 'Lark — BHXH (toàn công ty)', ...byMonth(larkOut(larkInsurance)) },
        labor_bonus:     { source: 'Lark — Thưởng NS, Phúc lợi (dept: KD)', ...byMonth(larkOut(larkBonus)) },

        mgmt_salary:  { source: 'Lark — T/ứng lương (dept: QLC)', ...byMonth(larkOut(larkSalaryQLC)) },
        mgmt_bonus:   { source: 'Lark — Thưởng NS (dept: QLC)', ...byMonth(larkOut(larkBonusQLC)) },

        indirect_marketing: {
            source: 'Lark — Quảng cáo/MKT + Chi phí bộ phận',
            ...byMonth([
                ...larkOut(larkMarketing),
                ...expMarketing.map(r => ({ date: r.date, amount: r.amount })),
            ]),
        },
        indirect_general:     { source: 'Lark — CP chung, Điện, Internet, Thuê nhà, Xăng', ...byMonth(larkOut(larkGeneral)) },
        indirect_equipment:   { source: 'Lark — Máy móc, CCDC, Đầu tư XNT', ...byMonth(larkOut(larkEquipment)) },
        indirect_renovation:  { source: 'Lark — Sửa chữa, Sửa chữa MM', ...byMonth(larkOut(larkRenovation)) },
        indirect_other: {
            source: 'Lark — Chi phí khác + Chi phí bộ phận KD',
            ...byMonth([
                ...larkOut(larkOther),
                ...expOther.map(r => ({ date: r.date, amount: r.amount })),
            ]),
        },
    };

    return Response.json({ year, results });
});
