import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where = { deletedAt: null };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
    ];

    const [processes, total] = await Promise.all([
        prisma.contractProcess.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, phone: true, code: true } },
                contract: { select: { id: true, code: true, contractValue: true, paidAmount: true } },
                steps: { select: { id: true, progress: true, status: true, isPaymentStep: true, paymentPercent: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.contractProcess.count({ where }),
    ]);

    const stats = {
        total,
        byStatus: {
            'Đang thực hiện': 0,
            'Đang thiết kế': 0,
            'Đang sản xuất': 0,
            'Đang thi công': 0,
            'Chờ nghiệm thu': 0,
            'Hoàn thành': 0,
        },
        totalContractValue: 0,
        totalPaid: 0,
    };
    processes.forEach(p => {
        if (stats.byStatus[p.status] !== undefined) stats.byStatus[p.status]++;
        if (p.contract) {
            stats.totalContractValue += p.contract.contractValue || 0;
            stats.totalPaid += p.contract.paidAmount || 0;
        }
    });
    stats.totalDebt = stats.totalContractValue - stats.totalPaid;

    return NextResponse.json({ processes, stats });
});

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const { customerId, contractId, type, name, startDate, endDate, notes, templateId } = body;
    if (!customerId || !type) {
        return NextResponse.json({ error: 'customerId và type là bắt buộc' }, { status: 400 });
    }

    const count = await prisma.contractProcess.count();
    const code = `CP${String(count + 1).padStart(4, '0')}`;

    const proc = await prisma.contractProcess.create({
        data: {
            code,
            name: name || '',
            type,
            customerId,
            contractId: contractId || null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            notes: notes || '',
            createdBy: session.user.name || session.user.email,
        },
    });

    // Apply template
    let tpl = null;
    if (templateId) {
        tpl = await prisma.contractProcessTemplate.findUnique({
            where: { id: templateId },
            include: { steps: { orderBy: { sortOrder: 'asc' } } },
        });
    } else {
        tpl = await prisma.contractProcessTemplate.findFirst({
            where: { type, isDefault: true },
            include: { steps: { orderBy: { sortOrder: 'asc' } } },
        });
    }
    if (tpl) {
        await createStepsFromTemplate(proc.id, tpl.steps, startDate);
    }

    const full = await prisma.contractProcess.findUnique({
        where: { id: proc.id },
        include: {
            customer: { select: { id: true, name: true, phone: true, code: true } },
            steps: { orderBy: { sortOrder: 'asc' } },
        },
    });
    return NextResponse.json(full, { status: 201 });
});

async function createStepsFromTemplate(processId, templateSteps, startDateStr) {
    let currentDate = startDateStr ? new Date(startDateStr) : new Date();
    const idMap = {};
    const sorted = [...templateSteps].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const tplStep of sorted) {
        const mappedParentId = tplStep.parentId ? (idMap[tplStep.parentId] || null) : null;
        const isRoot = !tplStep.parentId;

        const stepStart = isRoot ? new Date(currentDate) : null;
        const stepEnd = isRoot ? new Date(currentDate) : null;
        if (stepEnd) stepEnd.setDate(stepEnd.getDate() + (tplStep.duration || 1));

        const created = await prisma.contractProcessStep.create({
            data: {
                processId,
                parentId: mappedParentId,
                wbs: tplStep.wbs,
                name: tplStep.name,
                department: tplStep.department,
                duration: tplStep.duration,
                sortOrder: tplStep.sortOrder,
                level: tplStep.level,
                isPaymentStep: tplStep.isPaymentStep,
                paymentPercent: tplStep.paymentPercent,
                color: tplStep.color,
                startDate: stepStart,
                endDate: stepEnd,
            },
        });
        idMap[tplStep.id] = created.id;

        if (isRoot && stepEnd) {
            currentDate = new Date(stepEnd);
        }
    }
}
