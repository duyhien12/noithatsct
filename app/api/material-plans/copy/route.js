import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request) => {
    const { fromProjectId, toProjectId } = await request.json();
    if (!fromProjectId || !toProjectId) return NextResponse.json({ error: 'Thiếu fromProjectId hoặc toProjectId' }, { status: 400 });
    if (fromProjectId === toProjectId) return NextResponse.json({ error: 'Không thể sao chép sang cùng dự án' }, { status: 400 });

    const items = await prisma.$queryRaw`
        SELECT * FROM "MaterialPlan"
        WHERE "projectId" = ${fromProjectId} AND "planType" = 'tracking'
        ORDER BY "createdAt" ASC
    `;

    if (!items.length) return NextResponse.json({ copied: 0 });

    let copied = 0;
    for (const item of items) {
        const qty = Math.max(0, Number(item.quantity) || 0);
        const price = Math.max(0, Number(item.unitPrice) || 0);
        const unit = item.unit || '';
        const customName = item.category || '';
        const costType = item.costType || 'Vật tư';
        const group1 = item.group1 || '';
        const group2 = item.group2 || '';

        if (item.productId) {
            await prisma.$executeRaw`
                INSERT INTO "MaterialPlan" (id, "projectId", "productId", quantity, "unitPrice", "totalAmount", "budgetUnitPrice", "actualCost", type, category, "costType", group1, group2, "supplierTag", status, notes, "planType", "wastePercent", "isLocked", "orderedQty", "receivedQty", "drawingUrl", "drawingNote", "unit", "createdAt")
                VALUES (gen_random_uuid(), ${toProjectId}, ${item.productId}, ${qty}, ${price}, ${qty * price}, ${price}, 0, 'Chính', ${customName}, ${costType}, ${group1}, ${group2}, '', 'Chưa đặt', '', 'tracking', 5, false, 0, 0, '', '', ${unit}, NOW())
            `;
        } else {
            await prisma.$executeRaw`
                INSERT INTO "MaterialPlan" (id, "projectId", quantity, "unitPrice", "totalAmount", "budgetUnitPrice", "actualCost", type, category, "costType", group1, group2, "supplierTag", status, notes, "planType", "wastePercent", "isLocked", "orderedQty", "receivedQty", "drawingUrl", "drawingNote", "unit", "createdAt")
                VALUES (gen_random_uuid(), ${toProjectId}, ${qty}, ${price}, ${qty * price}, ${price}, 0, 'Chính', ${customName}, ${costType}, ${group1}, ${group2}, '', 'Chưa đặt', '', 'tracking', 5, false, 0, 0, '', '', ${unit}, NOW())
            `;
        }
        copied++;
    }

    return NextResponse.json({ copied });
});
