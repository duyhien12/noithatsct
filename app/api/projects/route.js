import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { projectCreateSchema } from '@/lib/validations/project';
import { createDefaultFolders } from '@/lib/defaultFolders';

const PAID_EXPENSE_STATUSES = ['Đã chi', 'Hoàn thành', 'Đã thanh toán'];
const ACTIVE_STATUSES = ['Thi công', 'Đang thi công', 'Thiết kế', 'Chuẩn bị thi công'];
const DONE_STATUSES = ['Hoàn thành', 'Bàn giao', 'Hủy'];

function computeProjectMetrics(p) {
    // Real financials from joined relations
    const realContractValue = (p.contracts || []).reduce((s, c) => s + (c.contractValue || 0), 0);
    const realPaidAmount    = (p.contracts || []).reduce((s, c) => s + (c.paidAmount || 0), 0);
    const realSpent         = (p.expenses || [])
        .filter(e => PAID_EXPENSE_STATUSES.includes(e.status))
        .reduce((s, e) => s + (e.amount || 0), 0);
    const pendingExpenses   = (p.expenses || [])
        .filter(e => ['Chờ duyệt', 'Đã duyệt', 'Chờ thanh toán'].includes(e.status))
        .reduce((s, e) => s + (e.amount || 0), 0);

    // Prefer contract-level data over denormalized project fields
    const contractValue = realContractValue || p.contractValue || p.budget || 0;
    const paidAmount    = realPaidAmount    || p.paidAmount    || 0;
    const spent         = realSpent         || p.spent         || 0;

    const profit = contractValue - spent;
    const margin = contractValue > 0 ? Math.round((profit / contractValue) * 100) : null;

    // Workshop task completion rate
    const wsTasks = p.workshopTasks || [];
    const wsTotal = wsTasks.length;
    const wsDone  = wsTasks.filter(t => t.status === 'Hoàn thành').length;
    const wsProgress = wsTotal > 0 ? Math.round((wsDone / wsTotal) * 100) : null;

    // Health score + risk flags
    let healthScore = 100;
    const risks = [];
    const now = Date.now();

    if (p.startDate && p.endDate && !DONE_STATUSES.includes(p.status)) {
        const startTs = new Date(p.startDate).getTime();
        const endTs   = new Date(p.endDate).getTime();

        if (now > endTs && (p.progress || 0) < 100) {
            const overdueDays = Math.floor((now - endTs) / 86400000);
            risks.push({ type: 'overdue', label: `Quá hạn ${overdueDays}d` });
            healthScore = Math.min(healthScore, 15);
        } else if (now > startTs && endTs > startTs) {
            const elapsedPct = Math.min(100, ((now - startTs) / (endTs - startTs)) * 100);
            const gap = elapsedPct - (p.progress || 0);
            if (gap > 25) {
                risks.push({ type: 'delay', label: `Chậm ${Math.round(gap)}%` });
                healthScore = Math.min(healthScore, 35);
            } else if (gap > 12) {
                risks.push({ type: 'slow', label: 'Chậm nhẹ' });
                healthScore = Math.min(healthScore, 68);
            }
        }
    }

    const effectiveBudget = p.budget || 0;
    if (effectiveBudget > 0) {
        if (spent > effectiveBudget) {
            const overPct = Math.round(((spent - effectiveBudget) / effectiveBudget) * 100);
            risks.push({ type: 'budget', label: `Vượt NS ${overPct}%` });
            healthScore = Math.min(healthScore, 28);
        } else if (spent > effectiveBudget * 0.85) {
            risks.push({ type: 'nearBudget', label: 'Sắp hết NS' });
            healthScore = Math.min(healthScore, 58);
        }
    }

    return {
        contractValue,
        paidAmount,
        spent,
        pendingExpenses,
        profit,
        margin,
        wsProgress,
        healthScore,
        risks,
        // strip heavy relation arrays before sending to client
        contracts: undefined,
        expenses: undefined,
        workshopTasks: undefined,
    };
}

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const type   = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dept   = searchParams.get('dept');

    const where = {};
    if (dept === 'xay_dung')    where.createdByRole = 'xay_dung';
    else if (dept === 'kinh_doanh') where.NOT = { createdByRole: 'xay_dung' };
    if (type)   where.type   = type;
    if (status) where.status = status;
    if (search) where.name   = { contains: search };

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            include: {
                customer: { select: { name: true } },
                contracts: {
                    where: { deletedAt: null },
                    select: { contractValue: true, paidAmount: true, status: true },
                },
                expenses: {
                    where: { deletedAt: null },
                    select: { amount: true, status: true },
                },
                workshopTasks: {
                    select: { status: true, progress: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.project.count({ where }),
    ]);

    const enriched = projects.map(p => ({
        ...p,
        ...computeProjectMetrics(p),
    }));

    return NextResponse.json(paginatedResponse(enriched, total, { page, limit }));
});

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const data = projectCreateSchema.parse(body);

    let project;
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            project = await prisma.$transaction(async (tx) => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('project_code_da'))`;
                const records = await tx.$queryRaw`SELECT code FROM "Project" WHERE code LIKE 'DA%'`;
                const existing = new Set(records.map(r => r.code));
                const maxNum = records
                    .map(r => r.code.slice(2))
                    .filter(s => /^\d+$/.test(s))
                    .reduce((max, s) => Math.max(max, Number(s)), 0);
                let candidate = maxNum + 1;
                while (existing.has(`DA${String(candidate).padStart(3, '0')}`)) candidate++;
                const code = `DA${String(candidate).padStart(3, '0')}`;
                const proj = await tx.project.create({ data: { code, ...data, createdByRole: session?.user?.role || '' } });
                await createDefaultFolders(tx, proj.id);
                return proj;
            });
            break;
        } catch (err) {
            if (err.code === 'P2002' && attempt < 9) continue;
            throw err;
        }
    }

    return NextResponse.json(project, { status: 201 });
});
