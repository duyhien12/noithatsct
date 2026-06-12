import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, toNum } from '@/lib/costMgmt';

export const PUT = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    const b = await req.json();
    const fields = ['electric','water','rent','management','maintenance','tools','other','machineDepreciation','capacitySqm','machineHours'];
    const vals = {};
    fields.forEach(f => vals[f] = toNum(b[f]));
    const totalCost = vals.electric + vals.water + vals.rent + vals.management + vals.maintenance + vals.tools + vals.other + vals.machineDepreciation;

    await prisma.$executeRaw`
        UPDATE "CostMonthly" SET "month"=${b.month||''},"electric"=${vals.electric},"water"=${vals.water},
        "rent"=${vals.rent},"management"=${vals.management},"maintenance"=${vals.maintenance},
        "tools"=${vals.tools},"other"=${vals.other},"machineDepreciation"=${vals.machineDepreciation},
        "totalCost"=${totalCost},"capacitySqm"=${vals.capacitySqm||800},"machineHours"=${vals.machineHours||160}
        WHERE id=${id}
    `;
    return NextResponse.json({ ok: true, totalCost });
});

export const DELETE = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    await prisma.$executeRaw`DELETE FROM "CostMonthly" WHERE id=${id}`;
    return NextResponse.json({ ok: true });
});
