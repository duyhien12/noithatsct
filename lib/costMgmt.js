import prisma from '@/lib/prisma';

export async function ensureTables() {
    const ddls = [
        `CREATE TABLE IF NOT EXISTS "CostProject" (
            "id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT,
            "code" TEXT NOT NULL DEFAULT '', "name" TEXT NOT NULL DEFAULT '',
            "client" TEXT NOT NULL DEFAULT '', "signDate" TEXT,
            "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "vatPct" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
            "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
            "mgmtPct" DOUBLE PRECISION NOT NULL DEFAULT 0.04,
            "status" TEXT NOT NULL DEFAULT 'Báo giá',
            "notes" TEXT NOT NULL DEFAULT '',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "CostMaterial" (
            "id" TEXT NOT NULL PRIMARY KEY, "costProjectId" TEXT NOT NULL,
            "grp" TEXT NOT NULL DEFAULT '', "name" TEXT NOT NULL DEFAULT '',
            "detail" TEXT NOT NULL DEFAULT '', "unit" TEXT NOT NULL DEFAULT '',
            "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "wastePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "CostLabor" (
            "id" TEXT NOT NULL PRIMARY KEY, "costProjectId" TEXT NOT NULL,
            "category" TEXT NOT NULL DEFAULT '', "type" TEXT NOT NULL DEFAULT '',
            "unit" TEXT NOT NULL DEFAULT '',
            "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "CostOther" (
            "id" TEXT NOT NULL PRIMARY KEY, "costProjectId" TEXT NOT NULL,
            "name" TEXT NOT NULL DEFAULT '', "unit" TEXT NOT NULL DEFAULT '',
            "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "CostMachine" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL DEFAULT '', "startDate" TEXT,
            "originalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "depreciationYears" DOUBLE PRECISION NOT NULL DEFAULT 5,
            "monthlyDepreciation" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "note" TEXT NOT NULL DEFAULT '',
            "status" TEXT NOT NULL DEFAULT 'Đang dùng',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "CostMonthly" (
            "id" TEXT NOT NULL PRIMARY KEY, "month" TEXT NOT NULL,
            "electric" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "water" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "rent" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "management" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "maintenance" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "tools" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "other" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "machineDepreciation" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "capacitySqm" DOUBLE PRECISION NOT NULL DEFAULT 800,
            "machineHours" DOUBLE PRECISION NOT NULL DEFAULT 160,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "CostAllocation" (
            "id" TEXT NOT NULL PRIMARY KEY, "costProjectId" TEXT NOT NULL,
            "month" TEXT NOT NULL, "basis" TEXT NOT NULL DEFAULT 'Theo m²',
            "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "type" TEXT NOT NULL DEFAULT 'Chi phí xưởng',
            "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "note" TEXT NOT NULL DEFAULT '',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "CostSettings" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "vatPct" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
            "targetProfitPct" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
            "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
            "mgmtPct" DOUBLE PRECISION NOT NULL DEFAULT 0.04,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
    ];
    for (const sql of ddls) await prisma.$executeRawUnsafe(sql).catch(() => {});

    const indexes = [
        `CREATE INDEX IF NOT EXISTS "idx_cmat_cpid" ON "CostMaterial"("costProjectId")`,
        `CREATE INDEX IF NOT EXISTS "idx_clab_cpid" ON "CostLabor"("costProjectId")`,
        `CREATE INDEX IF NOT EXISTS "idx_coth_cpid" ON "CostOther"("costProjectId")`,
        `CREATE INDEX IF NOT EXISTS "idx_call_cpid" ON "CostAllocation"("costProjectId")`,
    ];
    for (const sql of indexes) await prisma.$executeRawUnsafe(sql).catch(() => {});
}

export function newId() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export const toNum = (v) => Number(v) || 0;

export function calcTotals(project, materials, labor, other, allocations) {
    const mat = materials.reduce((s, r) => s + toNum(r.amount), 0);
    const lab = labor.reduce((s, r) => s + toNum(r.amount), 0);
    const oth = other.reduce((s, r) => s + toNum(r.amount), 0);
    const allocFactory = allocations.filter(a => a.type === 'Chi phí xưởng').reduce((s, a) => s + toNum(a.amount), 0);
    const allocDepr = allocations.filter(a => a.type === 'Khấu hao').reduce((s, a) => s + toNum(a.amount), 0);
    const cogsSx = mat + lab + oth + allocFactory + allocDepr;
    const revenue = toNum(project.revenue);
    const commission = Math.round(revenue * toNum(project.commissionPct));
    const mgmt = Math.round(revenue * toNum(project.mgmtPct));
    const cogsTotal = cogsSx + commission + mgmt;
    const profit = revenue - cogsTotal;
    const profitPct = revenue > 0 ? profit / revenue : 0;
    return { mat, lab, oth, allocFactory, allocDepr, cogsSx, commission, mgmt, cogsTotal, profit, profitPct };
}
