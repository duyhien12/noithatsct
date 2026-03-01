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
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
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

    const contract = await prisma.contract.create({
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
        await prisma.contractPayment.createMany({ data: paymentData });
    }

    // Return with payments included
    const result = await prisma.contract.findUnique({
        where: { id: contract.id },
        include: { payments: true },
    });

    return NextResponse.json(result, { status: 201 });
});
