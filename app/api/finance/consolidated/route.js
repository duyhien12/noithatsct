import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

const KD_KEYS = [
    'rev_design', 'rev_furniture', 'rev_other',
    'labor_salary', 'labor_insurance', 'labor_bonus',
    'direct_design_dept', 'direct_factory', 'direct_order_other',
    'direct_contractor', 'direct_entertain', 'direct_supplies', 'company_fee',
    'mgmt_salary', 'mgmt_bonus',
    'indirect_marketing', 'indirect_general', 'indirect_equipment',
    'indirect_renovation', 'indirect_depreciation', 'indirect_other',
];

function emptyWorkshop() {
    return {
        revenue_external: 0, revenue_internal: 0,
        direct_material: 0, direct_labor: 0, direct_outsource: 0,
        indirect_electric: 0, indirect_equipment: 0,
        indirect_other: 0, indirect_depreciation: 0,
        total_rev: 0, total_direct: 0, total_indirect: 0,
        gross_profit: 0, net_profit: 0,
    };
}

function emptyKd() {
    const obj = {};
    for (const k of KD_KEYS) obj[k] = 0;
    return {
        ...obj,
        total_rev: 0, total_labor: 0, total_direct_order: 0,
        total_direct: 0, total_mgmt: 0, total_indirect: 0,
        gross_profit: 0, net_profit: 0,
    };
}

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    const [workshopEntries, kdEntries] = await Promise.all([
        prisma.workshopPLEntry.findMany({ where: { period: { startsWith: `${year}-` } } }),
        prisma.kdCostEntry.findMany({ where: { year } }),
    ]);

    // ── Workshop: nhóm theo tháng ─────────────────────────────────────────────
    const workshopByMonth = {};
    for (let m = 1; m <= 12; m++) workshopByMonth[m] = emptyWorkshop();

    for (const e of workshopEntries) {
        const m = parseInt(e.period.split('-')[1]);
        if (!workshopByMonth[m]) continue;
        const w = workshopByMonth[m];
        switch (e.entryType) {
            case 'REVENUE_EXTERNAL':      w.revenue_external    += e.amount; break;
            case 'REVENUE_INTERNAL':      w.revenue_internal    += e.amount; break;
            case 'DIRECT_MATERIAL':       w.direct_material     += e.amount; break;
            case 'DIRECT_LABOR_SALARY':   w.direct_labor        += e.amount; break;
            case 'DIRECT_OUTSOURCE':      w.direct_outsource    += e.amount; break;
            case 'INDIRECT_ELECTRIC':     w.indirect_electric   += e.amount; break;
            case 'INDIRECT_EQUIPMENT':    w.indirect_equipment  += e.amount; break;
            case 'INDIRECT_OTHER':        w.indirect_other      += e.amount; break;
            case 'INDIRECT_DEPRECIATION': w.indirect_depreciation += e.amount; break;
        }
    }

    for (let m = 1; m <= 12; m++) {
        const w = workshopByMonth[m];
        w.total_rev      = w.revenue_external + w.revenue_internal;
        w.total_direct   = w.direct_material + w.direct_labor + w.direct_outsource;
        w.total_indirect = w.indirect_electric + w.indirect_equipment + w.indirect_other + w.indirect_depreciation;
        w.gross_profit   = w.total_rev - w.total_direct;
        w.net_profit     = w.gross_profit - w.total_indirect;
    }

    // ── KD: nhóm theo tháng ───────────────────────────────────────────────────
    const kdByMonth = {};
    for (let m = 1; m <= 12; m++) kdByMonth[m] = emptyKd();

    for (const e of kdEntries) {
        if (kdByMonth[e.month] && KD_KEYS.includes(e.rowKey)) {
            kdByMonth[e.month][e.rowKey] += e.amount;
        }
    }

    for (let m = 1; m <= 12; m++) {
        const k = kdByMonth[m];
        k.total_rev          = k.rev_design + k.rev_furniture + k.rev_other;
        k.total_labor        = k.labor_salary + k.labor_insurance + k.labor_bonus;
        k.total_direct_order = k.direct_design_dept + k.direct_factory + k.direct_order_other
                             + k.direct_contractor + k.direct_entertain + k.direct_supplies;
        k.total_direct       = k.total_labor + k.total_direct_order + k.company_fee;
        k.total_mgmt         = k.mgmt_salary + k.mgmt_bonus;
        k.total_indirect     = k.total_mgmt + k.indirect_marketing + k.indirect_general
                             + k.indirect_equipment + k.indirect_renovation
                             + k.indirect_depreciation + k.indirect_other;
        k.gross_profit       = k.total_rev - k.total_direct;
        k.net_profit         = k.gross_profit - k.total_indirect;
    }

    // ── Hợp nhất theo tháng ───────────────────────────────────────────────────
    // Loại trừ: Workshop.revenue_internal = KD.direct_factory (giao dịch nội bộ)
    const months = {};
    for (let m = 1; m <= 12; m++) {
        const w = workshopByMonth[m];
        const k = kdByMonth[m];

        const elim_rev  = w.revenue_internal; // xưởng thu từ KD → loại
        const elim_cost = k.direct_factory;   // KD trả xưởng    → loại

        const cons_rev      = w.revenue_external + k.total_rev;
        const cons_direct   = w.total_direct + (k.total_direct - k.direct_factory);
        const cons_indirect = w.total_indirect + k.total_indirect;
        const cons_gross    = cons_rev - cons_direct;
        const cons_net      = cons_gross - cons_indirect;

        months[m] = {
            workshop: w,
            kd: k,
            elimination: { revenue: elim_rev, cost: elim_cost },
            consolidated: {
                total_rev: cons_rev,
                total_direct: cons_direct,
                total_indirect: cons_indirect,
                gross_profit: cons_gross,
                net_profit: cons_net,
            },
        };
    }

    // ── Tổng năm ─────────────────────────────────────────────────────────────
    const sum = (key) => Object.values(months).reduce((s, m) => s + (m[key] || 0), 0);
    const sumNested = (section, key) =>
        Object.values(months).reduce((s, m) => s + (m[section]?.[key] || 0), 0);

    const yearTotal = {
        workshop: {
            revenue_external: sumNested('workshop', 'revenue_external'),
            revenue_internal: sumNested('workshop', 'revenue_internal'),
            total_rev:        sumNested('workshop', 'total_rev'),
            total_direct:     sumNested('workshop', 'total_direct'),
            total_indirect:   sumNested('workshop', 'total_indirect'),
            gross_profit:     sumNested('workshop', 'gross_profit'),
            net_profit:       sumNested('workshop', 'net_profit'),
            direct_material:  sumNested('workshop', 'direct_material'),
            direct_labor:     sumNested('workshop', 'direct_labor'),
            direct_outsource: sumNested('workshop', 'direct_outsource'),
            indirect_electric:     sumNested('workshop', 'indirect_electric'),
            indirect_equipment:    sumNested('workshop', 'indirect_equipment'),
            indirect_other:        sumNested('workshop', 'indirect_other'),
            indirect_depreciation: sumNested('workshop', 'indirect_depreciation'),
        },
        kd: {
            rev_design:       sumNested('kd', 'rev_design'),
            rev_furniture:    sumNested('kd', 'rev_furniture'),
            rev_other:        sumNested('kd', 'rev_other'),
            total_rev:        sumNested('kd', 'total_rev'),
            labor_salary:     sumNested('kd', 'labor_salary'),
            labor_insurance:  sumNested('kd', 'labor_insurance'),
            labor_bonus:      sumNested('kd', 'labor_bonus'),
            total_labor:      sumNested('kd', 'total_labor'),
            direct_design_dept:   sumNested('kd', 'direct_design_dept'),
            direct_factory:       sumNested('kd', 'direct_factory'),
            direct_order_other:   sumNested('kd', 'direct_order_other'),
            direct_contractor:    sumNested('kd', 'direct_contractor'),
            direct_entertain:     sumNested('kd', 'direct_entertain'),
            direct_supplies:      sumNested('kd', 'direct_supplies'),
            company_fee:          sumNested('kd', 'company_fee'),
            total_direct:         sumNested('kd', 'total_direct'),
            mgmt_salary:      sumNested('kd', 'mgmt_salary'),
            mgmt_bonus:       sumNested('kd', 'mgmt_bonus'),
            total_mgmt:       sumNested('kd', 'total_mgmt'),
            indirect_marketing:   sumNested('kd', 'indirect_marketing'),
            indirect_general:     sumNested('kd', 'indirect_general'),
            indirect_equipment:   sumNested('kd', 'indirect_equipment'),
            indirect_renovation:  sumNested('kd', 'indirect_renovation'),
            indirect_depreciation:sumNested('kd', 'indirect_depreciation'),
            indirect_other:       sumNested('kd', 'indirect_other'),
            total_indirect:       sumNested('kd', 'total_indirect'),
            gross_profit:     sumNested('kd', 'gross_profit'),
            net_profit:       sumNested('kd', 'net_profit'),
        },
        elimination: {
            revenue: sumNested('elimination', 'revenue'),
            cost:    sumNested('elimination', 'cost'),
        },
        consolidated: {
            total_rev:      sumNested('consolidated', 'total_rev'),
            total_direct:   sumNested('consolidated', 'total_direct'),
            total_indirect: sumNested('consolidated', 'total_indirect'),
            gross_profit:   sumNested('consolidated', 'gross_profit'),
            net_profit:     sumNested('consolidated', 'net_profit'),
        },
    };

    return Response.json({ year, months, yearTotal });
});
