import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, toNum, calcTotals } from '@/lib/costMgmt';

export const GET = withAuth(async () => {
    await ensureTables();

    const [projects, settings] = await Promise.all([
        prisma.$queryRaw`SELECT * FROM "CostProject" ORDER BY "createdAt" DESC`,
        prisma.$queryRaw`SELECT * FROM "CostSettings" WHERE id='default'`.then(r => r[0] || { vatPct: 0.08, targetProfitPct: 0.18, commissionPct: 0.05, mgmtPct: 0.04 }),
    ]);

    const projectData = [];
    let totalRevenue = 0, totalProfit = 0, totalCogs = 0;

    for (const p of projects) {
        const [mats, labs, oths, allocs] = await Promise.all([
            prisma.$queryRaw`SELECT amount FROM "CostMaterial" WHERE "costProjectId"=${p.id}`,
            prisma.$queryRaw`SELECT amount FROM "CostLabor" WHERE "costProjectId"=${p.id}`,
            prisma.$queryRaw`SELECT amount FROM "CostOther" WHERE "costProjectId"=${p.id}`,
            prisma.$queryRaw`SELECT amount, type FROM "CostAllocation" WHERE "costProjectId"=${p.id}`,
        ]);
        const proj = { ...p, revenue: toNum(p.revenue), commissionPct: toNum(p.commissionPct), mgmtPct: toNum(p.mgmtPct) };
        const t = calcTotals(proj, mats, labs, oths, allocs);
        totalRevenue += proj.revenue;
        totalProfit += t.profit;
        totalCogs += t.cogsTotal;
        projectData.push({ ...proj, ...t });
    }

    const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

    return NextResponse.json({
        projects: projectData,
        summary: { totalRevenue, totalProfit, totalCogs, avgMargin, count: projects.length },
        settings,
    });
});
