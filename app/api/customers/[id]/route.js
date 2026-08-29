import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { customerUpdateSchema } from '@/lib/validations/customer';
import { z } from 'zod';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
            projects: {
                include: {
                    milestones: { orderBy: { order: 'asc' } },
                    contracts: { select: { id: true, code: true, name: true, contractValue: true, paidAmount: true, status: true } },
                    _count: { select: { workOrders: true, expenses: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
            quotations: { include: { items: true }, orderBy: { createdAt: 'desc' } },
            contracts: {
                include: {
                    payments: { orderBy: { createdAt: 'asc' } },
                    project: { select: { name: true, code: true } },
                },
                orderBy: { createdAt: 'desc' },
            },
            documents: { orderBy: { createdAt: 'desc' } },
        },
    });
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get tracking logs for all customer's projects + customer-level
    const projectIds = customer.projects.map(p => p.id);
    const trackingLogs = await prisma.trackingLog.findMany({
        where: { OR: [{ customerId: id }, ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : [])] },
        include: { project: { select: { name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
    });

    // Get recent transactions
    const transactions = projectIds.length > 0 ? await prisma.transaction.findMany({
        where: { projectId: { in: projectIds } },
        include: { project: { select: { name: true, code: true } } },
        orderBy: { date: 'desc' },
        take: 20,
    }) : [];

    // Aggregates
    const totalContractValue = customer.contracts.reduce((s, c) => s + c.contractValue, 0);
    const totalPaid = customer.contracts.reduce((s, c) => s + c.paidAmount, 0);
    const totalDebt = totalContractValue - totalPaid;

    return NextResponse.json({
        ...customer,
        trackingLogs,
        transactions,
        stats: { totalContractValue, totalPaid, totalDebt, projectCount: customer.projects.length, contractCount: customer.contracts.length },
    });
});

const lastContactSchema = z.string().optional().nullable().transform(v => v ? new Date(v) : null);

export const PUT = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();

    // thiet_ke chỉ được sửa khách hàng của phòng thiết kế
    const role = session?.user?.role;
    const email = session?.user?.email;
    const privilegedRoles = ['admin', 'ban_gd', 'giam_doc', 'pho_gd'];
    const privilegedEmails = ['vancuong@kientrucsct.com', 'ngocquynh@kientrucsct.com'];
    const isPrivileged = privilegedRoles.includes(role) || privilegedEmails.includes(email);
    if (!isPrivileged) {
        const existing = await prisma.customer.findUnique({ where: { id }, select: { createdByRole: true } });
        if (!existing) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
        if (existing.createdByRole !== role) {
            return NextResponse.json({ error: 'Bạn chỉ có thể chỉnh sửa khách hàng của phòng mình' }, { status: 403 });
        }
    }

    // Parse chỉ các field có trong body để tránh Zod default() ghi đè toàn bộ
    const { lastContactAt, ...bodyRest } = body;
    const parsed = customerUpdateSchema.parse(bodyRest);
    const updateData = {};
    for (const key of Object.keys(bodyRest)) {
        if (key in parsed) {
            updateData[key] = parsed[key];
        }
    }
    if ('lastContactAt' in body) {
        updateData.lastContactAt = lastContactSchema.parse(lastContactAt);
    }

    const customer = await prisma.customer.update({ where: { id }, data: updateData });
    return NextResponse.json(customer);
}, { roles: ['admin', 'ban_gd', 'giam_doc', 'pho_gd', 'kinh_doanh', 'thiet_ke', 'xay_dung'], emails: ['vancuong@kientrucsct.com', 'ngocquynh@kientrucsct.com'] });

export const DELETE = withAuth(async (request, { params }, session) => {
    const { id } = await params;

    // thiet_ke chỉ được xóa khách hàng của phòng mình
    const role = session?.user?.role;
    const email = session?.user?.email;
    const privilegedRoles = ['admin', 'ban_gd', 'giam_doc'];
    const privilegedEmails = ['vancuong@kientrucsct.com', 'ngocquynh@kientrucsct.com'];
    const isPrivileged = privilegedRoles.includes(role) || privilegedEmails.includes(email);
    if (!isPrivileged) {
        const existing = await prisma.customer.findUnique({ where: { id }, select: { createdByRole: true } });
        if (!existing) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
        if (existing.createdByRole !== role) {
            return NextResponse.json({ error: 'Bạn chỉ có thể xóa khách hàng của phòng mình' }, { status: 403 });
        }
    }

    await prisma.$transaction(async (tx) => {
        const projects = await tx.project.findMany({ where: { customerId: id }, select: { id: true } });
        const projectIds = projects.map(p => p.id);

        if (projectIds.length > 0) {
            // Delete all project child records
            await tx.contractPayment.deleteMany({ where: { contract: { projectId: { in: projectIds } } } });
            await tx.contract.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.workOrder.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.materialPlan.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { projectId: { in: projectIds } } } });
            await tx.purchaseOrder.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.projectExpense.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.trackingLog.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.projectDocument.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.projectMilestone.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.projectBudget.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.contractorPayment.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.projectEmployee.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.inventoryTransaction.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.transaction.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.quotationItem.deleteMany({ where: { quotation: { projectId: { in: projectIds } } } });
            await tx.quotation.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.project.deleteMany({ where: { customerId: id } });
        }

        // Delete customer-level quotations (not linked to project)
        await tx.quotationItem.deleteMany({ where: { quotation: { customerId: id } } });
        await tx.quotation.deleteMany({ where: { customerId: id } });
        // Delete customer-level contracts
        await tx.contractPayment.deleteMany({ where: { contract: { customerId: id } } });
        await tx.contract.deleteMany({ where: { customerId: id } });
        // Delete customer-level tracking logs & documents
        await tx.trackingLog.deleteMany({ where: { customerId: id } });
        await tx.projectDocument.deleteMany({ where: { customerId: id } });
        await tx.customer.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
}, { roles: ['admin', 'ban_gd', 'giam_doc', 'thiet_ke'], emails: ['vancuong@kientrucsct.com', 'ngocquynh@kientrucsct.com'] });
