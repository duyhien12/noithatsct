import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: preview what would be imported (dry-run)
// POST: actually create entries

async function calcImports(period) {
    const [y, m] = period.split('-').map(Number);
    const periodStart = new Date(y, m - 1, 1);
    const periodEnd   = new Date(y, m, 1);

    const [attendance, inventoryTx, fixedAssets] = await Promise.all([
        prisma.workshopAttendance.findMany({
            where: { date: { gte: periodStart, lt: periodEnd } },
            include: { worker: { select: { hourlyRate: true, name: true } } },
        }),
        prisma.inventoryTransaction.findMany({
            where: { type: 'Xuất', date: { gte: periodStart, lt: periodEnd } },
            include: { product: { select: { importPrice: true, name: true } } },
        }),
        prisma.fixedAsset.findMany({
            where: { status: { not: 'Đã thanh lý' }, depreciationRate: { gt: 0 } },
            select: { originalCost: true, depreciationRate: true, name: true },
        }),
    ]);

    const laborCost = attendance.reduce((s, a) => s + a.hoursWorked * (a.worker?.hourlyRate || 0), 0);
    const materialCost = inventoryTx.reduce((s, tx) => s + tx.quantity * (tx.product?.importPrice || 0), 0);
    const depreciationMonthly = fixedAssets.reduce((s, a) => s + (a.originalCost * a.depreciationRate / 100 / 12), 0);

    return [
        {
            entryType: 'DIRECT_LABOR_SALARY',
            amount: Math.round(laborCost),
            description: `[AUTO] Lương từ ${attendance.length} ngày công`,
            notes: `[auto-import] period=${period}`,
        },
        {
            entryType: 'DIRECT_MATERIAL',
            amount: Math.round(materialCost),
            description: `[AUTO] Vật tư từ ${inventoryTx.length} phiếu xuất kho`,
            notes: `[auto-import] period=${period}`,
        },
        {
            entryType: 'INDIRECT_DEPRECIATION',
            amount: Math.round(depreciationMonthly),
            description: `[AUTO] Khấu hao ${fixedAssets.length} tài sản cố định`,
            notes: `[auto-import] period=${period}`,
        },
    ].filter(e => e.amount > 0);
}

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const period = searchParams.get('period') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const imports = await calcImports(period);

    // Check existing auto entries for this period
    const existing = await prisma.workshopPLEntry.findMany({
        where: { period, notes: { startsWith: '[auto-import]' } },
        select: { entryType: true, amount: true, description: true },
    });

    return NextResponse.json({ preview: imports, existing, period });
});

export const POST = withAuth(async (req) => {
    const body = await req.json();
    const now = new Date();
    const period = body.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const imports = await calcImports(period);
    if (imports.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu để import' }, { status: 400 });
    }

    // Delete previous auto-imports for this period (idempotent)
    await prisma.workshopPLEntry.deleteMany({
        where: { period, notes: { startsWith: '[auto-import]' } },
    });

    // Create new entries
    await prisma.workshopPLEntry.createMany({
        data: imports.map(e => ({ ...e, period })),
    });

    return NextResponse.json({ success: true, imported: imports });
});
