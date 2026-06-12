import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, newId, toNum } from '@/lib/costMgmt';

async function calcMachineDeprFromAssets() {
    const machines = await prisma.fixedAsset.findMany({
        where: { assetType: 'Máy móc - Thiết bị', status: 'Đang dùng' },
        select: { originalCost: true, depreciationRate: true },
    }).catch(() => []);
    return machines.reduce((s, m) => s + Math.round(toNum(m.originalCost) * toNum(m.depreciationRate) / 12), 0);
}

export const GET = withAuth(async () => {
    await ensureTables();
    const rows = await prisma.$queryRaw`SELECT * FROM "CostMonthly" ORDER BY month DESC`;
    return NextResponse.json(rows.map(r => ({
        ...r,
        electric: toNum(r.electric), water: toNum(r.water), rent: toNum(r.rent),
        management: toNum(r.management), maintenance: toNum(r.maintenance),
        tools: toNum(r.tools), other: toNum(r.other),
        machineDepreciation: toNum(r.machineDepreciation),
        totalCost: toNum(r.totalCost), capacitySqm: toNum(r.capacitySqm),
        machineHours: toNum(r.machineHours),
    })));
});

export const POST = withAuth(async (req) => {
    await ensureTables();
    const b = await req.json();
    const id = newId();
    const fields = ['electric','water','rent','management','maintenance','tools','other','machineDepreciation','capacitySqm','machineHours'];
    const vals = {};
    fields.forEach(f => vals[f] = toNum(b[f]));

    // Tự động lấy khấu hao từ Tài sản cố định loại Máy móc đang dùng nếu không nhập thủ công
    if (!vals.machineDepreciation) {
        vals.machineDepreciation = await calcMachineDeprFromAssets();
    }

    // Tổng CP xưởng = tất cả ngoài machineDepreciation + machineDepreciation
    const totalCost = vals.electric + vals.water + vals.rent + vals.management + vals.maintenance + vals.tools + vals.other + vals.machineDepreciation;

    await prisma.$executeRaw`
        INSERT INTO "CostMonthly" ("id","month","electric","water","rent","management","maintenance","tools","other","machineDepreciation","totalCost","capacitySqm","machineHours")
        VALUES (${id},${b.month||''},${vals.electric},${vals.water},${vals.rent},${vals.management},${vals.maintenance},${vals.tools},${vals.other},${vals.machineDepreciation},${totalCost},${vals.capacitySqm||800},${vals.machineHours||160})
    `;
    return NextResponse.json({ id, totalCost });
});
