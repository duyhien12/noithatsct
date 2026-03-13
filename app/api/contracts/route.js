import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { contractCreateSchema } from '@/lib/validations/contract';

// Preset payment phases per contract type
const PAYMENT_TEMPLATES = {
    'Thiết kế': [
        { phase: 'Đặt cọc thiết kế', pct: 50, category: 'Thiết kế' },
        { phase: 'Nghiệm thu bản vẽ', pct: 50, category: 'Thiết kế' },
    ],
    'Thi công thô': [
        { phase: 'Đặt cọc thi công', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện móng + khung', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện xây thô', pct: 30, category: 'Thi công' },
        { phase: 'Nghiệm thu bàn giao thô', pct: 10, category: 'Thi công' },
    ],
    'Thi công hoàn thiện': [
        { phase: 'Đặt cọc hoàn thiện', pct: 30, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện trát + ốp lát', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện sơn + điện nước', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Nghiệm thu bàn giao', pct: 20, category: 'Hoàn thiện' },
    ],
    'Nội thất': [
        { phase: 'Đặt cọc nội thất', pct: 50, category: 'Nội thất' },
        { phase: 'Giao hàng + lắp đặt', pct: 40, category: 'Nội thất' },
        { phase: 'Nghiệm thu hoàn thiện', pct: 10, category: 'Nội thất' },
    ],
};

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { code: { contains: search } },
        ];
    }

    const [contracts, total] = await Promise.all([
        prisma.contract.findMany({
            where,
            include: {
                customer: { select: { name: true, code: true } },
                project: { select: { name: true, code: true, status: true } },
                quotation: { select: { code: true } },
                payments: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.contract.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(contracts, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { paymentPhases, ...validated } = contractCreateSchema.parse(body);

    const code = await generateCode('contract', 'HD');
    const contractValue = Number(validated.contractValue) || 0;

    const result = await prisma.$transaction(async (tx) => {
        const contract = await tx.contract.create({
            data: {
                code,
                name: validated.name,
                type: validated.type || 'Thi công thô',
                contractValue,
                status: validated.signDate ? 'Đã ký' : 'Nháp',
                signDate: validated.signDate || null,
                startDate: validated.startDate || null,
                endDate: validated.endDate || null,
                paymentTerms: validated.paymentTerms || '',
                notes: validated.notes || '',
                customerId: validated.customerId,
                projectId: validated.projectId,
                quotationId: validated.quotationId || null,
            },
        });

        // Create payment phases: use client-sent phases if available, else fall back to template
        const phases = paymentPhases?.length > 0
            ? paymentPhases
            : (PAYMENT_TEMPLATES[validated.type] || []).map(t => ({
                phase: t.phase, pct: t.pct, category: t.category,
                amount: Math.round(contractValue * t.pct / 100),
            }));

        if (phases.length > 0) {
            const paymentData = phases.map(t => ({
                contractId: contract.id,
                phase: t.phase,
                amount: Number(t.amount) || Math.round(contractValue * Number(t.pct || 0) / 100),
                paidAmount: 0,
                category: t.category || validated.type || 'Hợp đồng',
                status: 'Chưa thu',
            }));
            await tx.contractPayment.createMany({ data: paymentData });
        }

        // Auto-create MaterialPlan from quotation items (if quotation linked)
        if (validated.quotationId && validated.projectId) {
            const qItems = await tx.quotationItem.findMany({
                where: { quotationId: validated.quotationId, productId: { not: null } },
                include: {
                    product: { select: { importPrice: true } },
                    category: { select: { group: true, name: true } },
                },
            });

            // Group by productId, sum quantities
            const grouped = {};
            for (const item of qItems) {
                const pid = item.productId;
                if (!grouped[pid]) {
                    grouped[pid] = {
                        qty: 0,
                        unitPrice: item.product?.importPrice || item.unitPrice || 0,
                        category: item.category?.group || item.category?.name || '',
                    };
                }
                grouped[pid].qty += item.volume || item.quantity || 0;
            }

            // Skip products that already have a MaterialPlan in this project
            const existing = await tx.materialPlan.findMany({
                where: { projectId: validated.projectId },
                select: { productId: true },
            });
            const existingSet = new Set(existing.map(e => e.productId));

            const newPlans = Object.entries(grouped)
                .filter(([pid]) => !existingSet.has(pid))
                .filter(([, { qty }]) => qty > 0)
                .map(([productId, { qty, unitPrice, category }]) => ({
                    productId,
                    projectId: validated.projectId,
                    quantity: qty,
                    unitPrice,
                    totalAmount: qty * unitPrice,
                    budgetUnitPrice: unitPrice,
                    category,
                    status: 'Chưa đặt',
                    type: 'Chính',
                }));

            if (newPlans.length > 0) {
                await tx.materialPlan.createMany({ data: newPlans });
            }
        }

        return await tx.contract.findUnique({
            where: { id: contract.id },
            include: { payments: true },
        });
    });

    return NextResponse.json(result, { status: 201 });
});
