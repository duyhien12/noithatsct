import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, newId, toNum } from '@/lib/costMgmt';

export const POST = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    const b = await req.json();
    const rowId = newId();

    // Lấy đơn giá tự động từ CostMonthly nếu không truyền
    let unitPrice = toNum(b.unitPrice);
    if (!unitPrice && b.month) {
        const [monthly] = await prisma.$queryRaw`SELECT * FROM "CostMonthly" WHERE month=${b.month}`.catch(() => [null]);
        if (monthly) {
            const capacitySqm = toNum(monthly.capacitySqm) || 800;
            unitPrice = b.type === 'Khấu hao'
                ? Math.round(toNum(monthly.machineDepreciation) / capacitySqm)
                : Math.round((toNum(monthly.totalCost) - toNum(monthly.machineDepreciation)) / capacitySqm);
        }
    }
    const amount = Math.round(toNum(b.qty) * unitPrice);

    await prisma.$executeRaw`
        INSERT INTO "CostAllocation" ("id","costProjectId","month","basis","qty","unitPrice","type","amount","note")
        VALUES (${rowId},${id},${b.month||''},${b.basis||'Theo m²'},${toNum(b.qty)},${unitPrice},${b.type||'Chi phí xưởng'},${amount},${b.note||''})
    `;
    return NextResponse.json({ id: rowId, unitPrice, amount });
});

export const PUT = withAuth(async (req) => {
    await ensureTables();
    const b = await req.json();
    const qty = toNum(b.qty), unitPrice = toNum(b.unitPrice);
    const amount = Math.round(qty * unitPrice);
    await prisma.$executeRaw`
        UPDATE "CostAllocation" SET "month"=${b.month||''},"basis"=${b.basis||'Theo m²'},
        "qty"=${qty},"unitPrice"=${unitPrice},"type"=${b.type||'Chi phí xưởng'},"amount"=${amount},"note"=${b.note||''}
        WHERE id=${b.id}
    `;
    return NextResponse.json({ ok: true, amount });
});

export const DELETE = withAuth(async (req) => {
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const rowId = searchParams.get('rowId');
    if (!rowId) return NextResponse.json({ error: 'rowId required' }, { status: 400 });
    await prisma.$executeRaw`DELETE FROM "CostAllocation" WHERE id=${rowId}`;
    return NextResponse.json({ ok: true });
});
