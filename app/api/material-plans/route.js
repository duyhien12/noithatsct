import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;
    const search = (searchParams.get('search') || '').trim();

    // Use raw query to avoid stale Prisma client issues
    let plans, total;
    if (search) {
        plans = await prisma.$queryRaw`
            SELECT mp.*,
                   p.name as "productName", p.code as "productCode", p.unit as "productUnit",
                   pr.name as "projectName", pr.code as "projectCode"
            FROM "MaterialPlan" mp
            LEFT JOIN "Product" p ON mp."productId" = p.id
            LEFT JOIN "Project" pr ON mp."projectId" = pr.id
            WHERE p.name ILIKE ${'%' + search + '%'}
               OR p.code ILIKE ${'%' + search + '%'}
               OR pr.name ILIKE ${'%' + search + '%'}
            ORDER BY mp."createdAt" DESC
            LIMIT ${limit} OFFSET ${skip}
        `;
        const countResult = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM "MaterialPlan" mp
            LEFT JOIN "Product" p ON mp."productId" = p.id
            LEFT JOIN "Project" pr ON mp."projectId" = pr.id
            WHERE p.name ILIKE ${'%' + search + '%'}
               OR p.code ILIKE ${'%' + search + '%'}
               OR pr.name ILIKE ${'%' + search + '%'}
        `;
        total = Number(countResult[0]?.count || 0);
    } else {
        plans = await prisma.$queryRaw`
            SELECT mp.*,
                   p.name as "productName", p.code as "productCode", p.unit as "productUnit",
                   pr.name as "projectName", pr.code as "projectCode"
            FROM "MaterialPlan" mp
            LEFT JOIN "Product" p ON mp."productId" = p.id
            LEFT JOIN "Project" pr ON mp."projectId" = pr.id
            ORDER BY mp."createdAt" DESC
            LIMIT ${limit} OFFSET ${skip}
        `;
        const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "MaterialPlan"`;
        total = Number(countResult[0]?.count || 0);
    }

    return NextResponse.json({
        data: plans,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();

    // Bulk mode
    if (body.items && Array.isArray(body.items)) {
        const { projectId, items, source } = body;
        if (!projectId) return NextResponse.json({ error: 'projectId bắt buộc' }, { status: 400 });

        const pt = items[0]?.planType || 'tracking';

        // Check existing productIds to skip duplicates
        const existingRaw = await prisma.$queryRaw`
            SELECT "productId" FROM "MaterialPlan"
            WHERE "projectId" = ${projectId} AND "planType" = ${pt} AND "productId" IS NOT NULL
        `;
        const existingSet = new Set(existingRaw.map(e => e.productId).filter(Boolean));

        const validItems = items.filter(i =>
            (i.productId && !existingSet.has(i.productId)) ||
            (!i.productId && (i.customName || '').trim())
        );

        for (const i of validItems) {
            const qty = Number(i.quantity) || 0;
            const price = Number(i.unitPrice) || 0;
            const actualCost = Number(i.actualCost) || 0;
            const costType = i.costType || 'Vật tư';
            const group1 = i.group1 || '';
            const group2 = i.group2 || '';
            const supplierTag = i.supplierTag || '';
            const notes = i.notes || (source ? `Từ ${source}` : '');
            const customName = (i.customName || '').trim();
            const productId = i.productId || null;

            if (productId) {
                await prisma.$executeRaw`
                    INSERT INTO "MaterialPlan" (id, "projectId", "productId", quantity, "unitPrice", "totalAmount", "budgetUnitPrice", "actualCost", type, category, "costType", group1, group2, "supplierTag", status, notes, "planType", "wastePercent", "isLocked", "orderedQty", "receivedQty", "drawingUrl", "drawingNote", "createdAt")
                    VALUES (gen_random_uuid(), ${projectId}, ${productId}, ${qty}, ${price}, ${qty * price}, ${price}, ${actualCost}, 'Chính', ${customName}, ${costType}, ${group1}, ${group2}, ${supplierTag}, 'Chưa đặt', ${notes}, ${pt}, 5, false, 0, 0, '', '', NOW())
                `;
            } else {
                await prisma.$executeRaw`
                    INSERT INTO "MaterialPlan" (id, "projectId", quantity, "unitPrice", "totalAmount", "budgetUnitPrice", "actualCost", type, category, "costType", group1, group2, "supplierTag", status, notes, "planType", "wastePercent", "isLocked", "orderedQty", "receivedQty", "drawingUrl", "drawingNote", "createdAt")
                    VALUES (gen_random_uuid(), ${projectId}, ${qty}, ${price}, ${qty * price}, ${price}, ${actualCost}, 'Chính', ${customName}, ${costType}, ${group1}, ${group2}, ${supplierTag}, 'Chưa đặt', ${notes}, ${pt}, 5, false, 0, 0, '', '', NOW())
                `;
            }
        }

        return NextResponse.json({ created: validItems.length, skipped: items.length - validItems.length }, { status: 201 });
    }

    // Single mode — also use raw SQL to bypass stale client
    const { projectId, productId, quantity, unitPrice, type, notes } = body;
    if (!projectId || !productId) return NextResponse.json({ error: 'projectId và productId bắt buộc' }, { status: 400 });
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const noteVal = notes || '';
    const typeVal = type || 'Chính';

    await prisma.$executeRaw`
        INSERT INTO "MaterialPlan" (id, "projectId", "productId", quantity, "unitPrice", "totalAmount", "budgetUnitPrice", type, status, notes, "planType", "wastePercent", "isLocked", "orderedQty", "receivedQty", "drawingUrl", "drawingNote", category, "costType", group1, group2, "supplierTag", "actualCost", "createdAt")
        VALUES (gen_random_uuid(), ${projectId}, ${productId}, ${qty}, ${price}, ${qty * price}, ${price}, ${typeVal}, 'Chưa đặt', ${noteVal}, 'tracking', 5, false, 0, 0, '', '', '', 'Vật tư', '', '', '', 0, NOW())
    `;

    const plan = await prisma.$queryRaw`
        SELECT mp.*, p.name as "productName", p.code as "productCode", p.unit as "productUnit"
        FROM "MaterialPlan" mp
        LEFT JOIN "Product" p ON mp."productId" = p.id
        WHERE mp."projectId" = ${projectId} AND mp."productId" = ${productId}
        ORDER BY mp."createdAt" DESC LIMIT 1
    `;
    return NextResponse.json(plan[0] || {}, { status: 201 });
});
