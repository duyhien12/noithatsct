import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

// POST /api/purchase-orders/[id]/receive
// Body: { items: [{ id: itemId, receivedQty: N }], note: "" }
export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { items, note } = await request.json();

    if (!items?.length) return NextResponse.json({ error: 'Không có item nào' }, { status: 400 });

    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true, project: { select: { id: true, name: true } } },
    });
    if (!po) return NextResponse.json({ error: 'PO không tồn tại' }, { status: 404 });

    const isDirectSite = po.deliveryType === 'Giao thẳng dự án';

    // Process each received item
    for (const recv of items) {
        const poItem = po.items.find(i => i.id === recv.id);
        if (!poItem) continue;
        const delta = Number(recv.receivedQty) || 0;
        if (delta <= 0) continue;

        // 1. Update PurchaseOrderItem.receivedQty
        await prisma.purchaseOrderItem.update({
            where: { id: recv.id },
            data: { receivedQty: { increment: delta } },
        });

        if (isDirectSite) {
            // 2a. Direct-to-site: update MaterialPlan.receivedQty (NO company stock change)
            if (poItem.materialPlanId) {
                const plan = await prisma.materialPlan.findUnique({ where: { id: poItem.materialPlanId } });
                if (plan) {
                    const newReceivedQty = plan.receivedQty + delta;
                    const newStatus = newReceivedQty >= plan.quantity ? 'Đã nhận đủ'
                        : newReceivedQty > 0 ? 'Nhận một phần' : plan.status;
                    await prisma.materialPlan.update({
                        where: { id: poItem.materialPlanId },
                        data: { receivedQty: { increment: delta }, status: newStatus },
                    });
                }
            }

            // 3. Auto-generate ProjectExpense for direct cost
            if (po.projectId && poItem.unitPrice > 0) {
                const expCode = await generateCode('projectExpense', 'CP');
                const amount = delta * poItem.unitPrice;
                await prisma.projectExpense.create({
                    data: {
                        code: expCode,
                        expenseType: 'Mua hàng',
                        description: `[GRN] ${poItem.productName} — ${po.code}`,
                        amount,
                        paidAmount: 0,
                        category: 'Vật tư',
                        status: 'Chờ thanh toán',
                        recipientType: 'supplier',
                        recipientName: po.supplier,
                        projectId: po.projectId,
                        notes: note || '',
                    },
                });
            }
        } else {
            // 2b. Into company warehouse: create InventoryTransaction
            if (poItem.productId) {
                const defaultWarehouse = await prisma.warehouse.findFirst({ orderBy: { name: 'asc' } });
                if (defaultWarehouse) {
                    const txCode = await generateCode('inventoryTransaction', 'PNK');
                    await prisma.inventoryTransaction.create({
                        data: {
                            code: txCode,
                            type: 'Nhập',
                            quantity: delta,
                            unit: poItem.unit,
                            note: `Nhập từ PO ${po.code} — ${po.supplier}. ${note || ''}`,
                            productId: poItem.productId,
                            warehouseId: defaultWarehouse.id,
                            projectId: po.projectId || null,
                        },
                    });
                    await prisma.product.update({
                        where: { id: poItem.productId },
                        data: { stock: { increment: delta } },
                    });
                }
            }
        }
    }

    // 4. Recalculate PO status
    const updatedItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
    const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
    const anyReceived = updatedItems.some(i => i.receivedQty > 0);
    const newStatus = allReceived ? 'Hoàn thành' : anyReceived ? 'Nhận một phần' : po.status;

    const updatedPO = await prisma.purchaseOrder.update({
        where: { id },
        data: {
            status: newStatus,
            receivedDate: allReceived ? new Date() : po.receivedDate,
        },
        include: { items: true },
    });

    return NextResponse.json(updatedPO);
});
