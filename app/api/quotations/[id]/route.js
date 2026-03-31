import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { quotationUpdateSchema } from '@/lib/validations/quotation';
import { generateCode } from '@/lib/generateCode';

const LOCKED_STATUSES = ['Hợp đồng', 'Từ chối'];

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
            customer: true,
            project: true,
            categories: {
                include: { items: { where: { parentItemId: null }, orderBy: { order: 'asc' }, include: { subItems: { orderBy: { order: 'asc' } } } } },
                orderBy: { order: 'asc' },
            },
            items: { where: { parentItemId: null }, include: { subItems: true } },
            children: { select: { id: true, code: true, status: true }, where: { deletedAt: null } },
        },
    });
    if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(quotation);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;

    // GĐ1: Lock check
    const existing = await prisma.quotation.findUnique({ where: { id }, select: { status: true, revision: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (LOCKED_STATUSES.includes(existing.status)) {
        return NextResponse.json({ error: `Báo giá đã "${existing.status}" — không thể sửa. Hãy tạo BG bổ sung.` }, { status: 403 });
    }

    const body = await request.json();
    const { categories, ...validated } = quotationUpdateSchema.parse(body);

    // Sanitize: only take valid Quotation fields, avoid Prisma error
    const ALLOWED = ['customerId', 'projectId', 'type', 'notes', 'status', 'validUntil',
        'vat', 'discount', 'managementFeeRate', 'managementFee', 'designFee', 'otherFee',
        'adjustment', 'adjustmentType', 'adjustmentAmount',
        'directCost', 'total', 'grandTotal', 'deductions', 'paymentSchedule'];
    const data = {};
    for (const key of ALLOWED) {
        if (key in validated) data[key] = validated[key];
    }
    // projectId: "" -> null to avoid FK error
    if (!data.projectId) data.projectId = null;

    // GĐ2: Auto revert 'Xác nhận' → 'Gửi KH' + increment revision
    if (existing.status === 'Xác nhận' && categories !== undefined) {
        data.status = 'Gửi KH';
        data.revision = existing.revision + 1;
    }

    // Wrap delete+recreate in a transaction
    await prisma.$transaction(async (tx) => {
        // Delete old categories & items if rebuilding
        if (categories !== undefined) {
            await tx.quotationItem.deleteMany({ where: { quotationId: id } });
            await tx.quotationCategory.deleteMany({ where: { quotationId: id } });
        }

        // Update quotation fields
        await tx.quotation.update({ where: { id }, data });

        // Recreate categories + items
        if (categories) {
            for (let ci = 0; ci < categories.length; ci++) {
                const cat = categories[ci];
                const created = await tx.quotationCategory.create({
                    data: {
                        name: cat.name || '',
                        group: cat.group || '',
                        image: cat.image || '',
                        order: ci,
                        subtotal: cat.subtotal || 0,
                        quotationId: id,
                    },
                });
                if (cat.items && cat.items.length > 0) {
                    for (let ii = 0; ii < cat.items.length; ii++) {
                        const item = cat.items[ii];
                        const parentItem = await tx.quotationItem.create({
                            data: {
                                name: item.name || '',
                                order: item.order ?? ii,
                                unit: item.unit || '',
                                quantity: Number(item.quantity) || 0,
                                volume: Number(item.volume) || 0,
                                mainMaterial: Number(item.mainMaterial) || 0,
                                auxMaterial: Number(item.auxMaterial) || 0,
                                labor: Number(item.labor) || 0,
                                unitPrice: Number(item.unitPrice) || 0,
                                amount: Number(item.amount) || 0,
                                description: item.description || '',
                                length: Number(item.length) || 0,
                                width: Number(item.width) || 0,
                                height: Number(item.height) || 0,
                                image: item.image || '',
                                productId: item.productId || null,
                                quotationId: id,
                                categoryId: created.id,
                            },
                        });
                        // Create sub-items
                        if (item.subItems && item.subItems.length > 0) {
                            await tx.quotationItem.createMany({
                                data: item.subItems.map((si, sii) => ({
                                    name: si.name || '',
                                    order: sii,
                                    unit: si.unit || '',
                                    quantity: Number(si.quantity) || 0,
                                    volume: Number(si.volume) || 0,
                                    unitPrice: Number(si.unitPrice) || 0,
                                    amount: Number(si.amount) || 0,
                                    description: si.description || '',
                                    length: Number(si.length) || 0,
                                    width: Number(si.width) || 0,
                                    height: Number(si.height) || 0,
                                    image: si.image || '',
                                    parentItemId: parentItem.id,
                                    quotationId: id,
                                    categoryId: created.id,
                                })),
                            });
                        }
                    }
                }
            }
        }
    });

    const result = await prisma.quotation.findUnique({
        where: { id },
        include: {
            customer: true,
            project: true,
            categories: { include: { items: true }, orderBy: { order: 'asc' } },
            items: true,
        },
    });

    return NextResponse.json(result);
});

// PATCH: cập nhật status nhanh (KH xác nhận, gửi KH...)
export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.quotation.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (LOCKED_STATUSES.includes(existing.status)) {
        return NextResponse.json({ error: `Báo giá đã "${existing.status}" — không thể thay đổi.` }, { status: 403 });
    }
    const { status } = await request.json();
    if (!['Nháp', 'Gửi KH', 'Xác nhận', 'Từ chối'].includes(status)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }
    const updated = await prisma.quotation.update({ where: { id }, data: { status } });
    return NextResponse.json({ status: updated.status });
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;

    // Null out FK references first to avoid constraint errors
    await prisma.quotation.updateMany({ where: { parentId: id }, data: { parentId: null } });
    await prisma.contract.updateMany({ where: { quotationId: id }, data: { quotationId: null } });
    // Delete sub-items first (parentItemId FK), then parent items, then categories, then quotation
    await prisma.quotationItem.deleteMany({ where: { quotationId: id, parentItemId: { not: null } } });
    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
    await prisma.quotationCategory.deleteMany({ where: { quotationId: id } });
    await prisma.quotation.delete({ where: { id } });

    return NextResponse.json({ success: true });
});

// GĐ3: Clone quotation (BG bổ sung / copy)
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const original = await prisma.quotation.findUnique({
        where: { id },
        include: { categories: { include: { items: { where: { parentItemId: null }, orderBy: { order: 'asc' }, include: { subItems: { orderBy: { order: 'asc' } } } } }, orderBy: { order: 'asc' } } },
    });
    if (!original) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const isSupplemental = body.type === 'supplemental'; // BG bổ sung vs copy

    const code = await generateCode('quotation', 'BG');
    const clone = await prisma.quotation.create({
        data: {
            code,
            customerId: original.customerId,
            projectId: original.projectId,
            type: original.type,
            notes: isSupplemental ? `BG bổ sung cho ${original.code}` : original.notes,
            vat: original.vat,
            discount: isSupplemental ? 0 : original.discount,
            managementFeeRate: original.managementFeeRate,
            designFee: isSupplemental ? 0 : original.designFee,
            otherFee: isSupplemental ? 0 : original.otherFee,
            status: 'Nháp',
            revision: 1,
            parentId: isSupplemental ? id : null,
        },
    });

    // Copy categories + items (skip for supplemental — starts empty)
    if (!isSupplemental && original.categories.length > 0) {
        for (const cat of original.categories) {
            const newCat = await prisma.quotationCategory.create({
                data: {
                    name: cat.name, group: cat.group, image: cat.image || '',
                    order: cat.order, subtotal: cat.subtotal, quotationId: clone.id,
                },
            });
            if (cat.items.length > 0) {
                for (const item of cat.items) {
                    const newItem = await prisma.quotationItem.create({
                        data: {
                            name: item.name, order: item.order, unit: item.unit,
                            quantity: item.quantity, volume: item.volume || 0,
                            mainMaterial: item.mainMaterial, auxMaterial: item.auxMaterial, labor: item.labor,
                            unitPrice: item.unitPrice, amount: item.amount,
                            description: item.description, length: item.length,
                            width: item.width, height: item.height, image: item.image,
                            productId: item.productId, quotationId: clone.id, categoryId: newCat.id,
                        },
                    });
                    if (item.subItems && item.subItems.length > 0) {
                        await prisma.quotationItem.createMany({
                            data: item.subItems.map(si => ({
                                name: si.name, order: si.order, unit: si.unit,
                                quantity: si.quantity, volume: si.volume || 0,
                                unitPrice: si.unitPrice, amount: si.amount,
                                description: si.description, length: si.length,
                                width: si.width, height: si.height, image: si.image || '',
                                parentItemId: newItem.id, quotationId: clone.id, categoryId: newCat.id,
                            })),
                        });
                    }
                }
            }
        }
    }

    return NextResponse.json(clone, { status: 201 });
});
