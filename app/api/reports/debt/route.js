import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

function agingBucket(refDate) {
    const days = Math.floor((Date.now() - new Date(refDate).getTime()) / 86400000);
    if (days <= 30) return '0–30';
    if (days <= 60) return '31–60';
    if (days <= 90) return '61–90';
    return '>90';
}

export const GET = withAuth(async () => {
    const [allPOs, allCPs] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where: { supplierId: { not: null } },
            select: {
                supplierId: true, totalAmount: true, paidAmount: true,
                orderDate: true, createdAt: true,
                supplierRel: { select: { id: true, code: true, name: true, type: true } },
            },
        }),
        prisma.contractorPayment.findMany({
            select: {
                contractorId: true, contractAmount: true, paidAmount: true,
                dueDate: true, createdAt: true,
                contractor: { select: { id: true, code: true, name: true, type: true } },
            },
        }),
    ]);

    // Aggregate suppliers
    const supplierMap = {};
    for (const po of allPOs) {
        const debt = (po.totalAmount || 0) - (po.paidAmount || 0);
        if (debt <= 0 || !po.supplierId) continue;
        if (!supplierMap[po.supplierId]) {
            supplierMap[po.supplierId] = { ...po.supplierRel, totalDebt: 0, aging: { '0–30': 0, '31–60': 0, '61–90': 0, '>90': 0 } };
        }
        supplierMap[po.supplierId].totalDebt += debt;
        supplierMap[po.supplierId].aging[agingBucket(po.orderDate || po.createdAt)] += debt;
    }

    // Aggregate contractors
    const contractorMap = {};
    for (const cp of allCPs) {
        const debt = (cp.contractAmount || 0) - (cp.paidAmount || 0);
        if (debt <= 0) continue;
        if (!contractorMap[cp.contractorId]) {
            contractorMap[cp.contractorId] = { ...cp.contractor, totalDebt: 0, aging: { '0–30': 0, '31–60': 0, '61–90': 0, '>90': 0 } };
        }
        contractorMap[cp.contractorId].totalDebt += debt;
        contractorMap[cp.contractorId].aging[agingBucket(cp.dueDate || cp.createdAt)] += debt;
    }

    const topSuppliers = Object.values(supplierMap).sort((a, b) => b.totalDebt - a.totalDebt);
    const topContractors = Object.values(contractorMap).sort((a, b) => b.totalDebt - a.totalDebt);

    const supplierTotal = topSuppliers.reduce((s, x) => s + x.totalDebt, 0);
    const contractorTotal = topContractors.reduce((s, x) => s + x.totalDebt, 0);

    const BUCKETS = ['0–30', '31–60', '61–90', '>90'];
    const supplierAging = Object.fromEntries(BUCKETS.map(b => [b, topSuppliers.reduce((s, x) => s + (x.aging[b] || 0), 0)]));
    const contractorAging = Object.fromEntries(BUCKETS.map(b => [b, topContractors.reduce((s, x) => s + (x.aging[b] || 0), 0)]));

    return NextResponse.json({ supplierTotal, contractorTotal, supplierAging, contractorAging, topSuppliers, topContractors });
});
