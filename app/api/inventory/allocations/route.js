import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async () => {
    // Export transactions grouped by project
    const txList = await prisma.inventoryTransaction.findMany({
        where: { type: 'Xuất', projectId: { not: null } },
        include: {
            product: { select: { id: true, name: true, code: true, unit: true } },
            project: { select: { id: true, name: true, code: true } },
        },
        orderBy: { date: 'desc' },
    });

    // Workshop task material reservations by project
    const taskMaterials = await prisma.workshopTaskMaterial.findMany({
        where: { task: { status: { notIn: ['Hoàn thành'] }, projectId: { not: null } } },
        include: {
            product: { select: { id: true, name: true, code: true, unit: true } },
            task: { select: { id: true, title: true, status: true, projectId: true, project: { select: { id: true, name: true, code: true } } } },
        },
    });

    // Build project-level consumption map
    const projectMap = {};

    txList.forEach(tx => {
        if (!tx.project) return;
        const pid = tx.projectId;
        if (!projectMap[pid]) {
            projectMap[pid] = {
                projectId: pid,
                projectName: tx.project.name,
                projectCode: tx.project.code,
                consumed: {},
                reserved: {},
            };
        }
        const prod = tx.productId;
        if (!projectMap[pid].consumed[prod]) {
            projectMap[pid].consumed[prod] = {
                productId: prod,
                productName: tx.product?.name || '',
                productCode: tx.product?.code || '',
                unit: tx.product?.unit || '',
                qty: 0,
            };
        }
        projectMap[pid].consumed[prod].qty += tx.quantity;
    });

    taskMaterials.forEach(m => {
        if (!m.task?.project) return;
        const pid = m.task.projectId;
        if (!projectMap[pid]) {
            projectMap[pid] = {
                projectId: pid,
                projectName: m.task.project.name,
                projectCode: m.task.project.code,
                consumed: {},
                reserved: {},
            };
        }
        const prod = m.productId;
        if (!projectMap[pid].reserved[prod]) {
            projectMap[pid].reserved[prod] = {
                productId: prod,
                productName: m.product?.name || '',
                productCode: m.product?.code || '',
                unit: m.product?.unit || '',
                qty: 0,
            };
        }
        projectMap[pid].reserved[prod].qty += m.quantity;
    });

    const allocations = Object.values(projectMap).map(p => ({
        projectId: p.projectId,
        projectName: p.projectName,
        projectCode: p.projectCode,
        consumed: Object.values(p.consumed).sort((a, b) => b.qty - a.qty),
        reserved: Object.values(p.reserved).sort((a, b) => b.qty - a.qty),
    })).sort((a, b) => b.consumed.length - a.consumed.length);

    return NextResponse.json({ allocations });
});
