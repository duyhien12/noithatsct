import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { VIEW_ROLES } from '@/lib/financeJournal';

// Sổ chi tiết tạm ứng của 1 nhân viên — lịch sử gộp Tạm ứng + Hoàn ứng theo dòng thời gian,
// kèm số dư chạy (running balance). Click "Số phiếu" ở UI mở đúng giao dịch tương ứng trong
// Nhật ký Thu – Chi (financeTransactionId trả kèm mỗi dòng có phát sinh tiền thật).
export const GET = withAuth(async (request, { params }) => {
    const { id: employeeId } = await params;

    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { department: { select: { id: true, name: true } } },
    });
    if (!employee) return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });

    const advances = await prisma.employeeAdvance.findMany({
        where: { employeeId },
        include: {
            project: { select: { id: true, name: true, code: true } },
            financeTransaction: { select: { id: true, code: true, status: true, attachments: true } },
            settlements: {
                include: { financeTransaction: { select: { id: true, code: true, status: true } } },
                orderBy: { date: 'asc' },
            },
        },
        orderBy: { date: 'asc' },
    });

    const events = [];
    for (const a of advances) {
        events.push({
            date: a.date, code: a.code, kind: 'advance', advanceId: a.id,
            advanceType: a.advanceType, content: a.content,
            project: a.project ? { id: a.project.id, name: a.project.name, code: a.project.code } : null,
            advanceAmount: a.amount, returnedAmount: 0, deductedAmount: 0,
            financeTransactionId: a.financeTransaction?.id || null,
            financeTransactionCode: a.financeTransaction?.code || null,
            attachments: a.financeTransaction?.attachments || [],
        });
        for (const s of a.settlements) {
            events.push({
                date: s.date, code: s.code, kind: 'settlement', advanceId: a.id,
                settleType: s.settleType, content: a.content,
                project: a.project ? { id: a.project.id, name: a.project.name, code: a.project.code } : null,
                advanceAmount: 0,
                returnedAmount: s.settleType !== 'salary_deduction' ? s.amount : 0,
                deductedAmount: s.settleType === 'salary_deduction' ? s.amount : 0,
                financeTransactionId: s.financeTransaction?.id || null,
                financeTransactionCode: s.financeTransaction?.code || null,
                attachments: s.proofUrl ? [{ url: s.proofUrl, name: 'Chứng từ quyết toán' }] : [],
            });
        }
    }
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = employee.openingAdvanceBalance || 0;
    const ledger = events.map(e => {
        running += e.advanceAmount - e.returnedAmount - e.deductedAmount;
        return { ...e, remaining: running };
    });

    const totalAdvance = advances.reduce((s, a) => s + a.amount, 0);
    const allSettlements = advances.flatMap(a => a.settlements);
    const totalReturned = allSettlements.filter(s => s.settleType !== 'salary_deduction').reduce((s, x) => s + x.amount, 0);
    const totalDeducted = allSettlements.filter(s => s.settleType === 'salary_deduction').reduce((s, x) => s + x.amount, 0);

    return NextResponse.json({
        employee: {
            id: employee.id, code: employee.code, name: employee.name, position: employee.position,
            departmentId: employee.departmentId, departmentName: employee.department?.name || '',
            openingAdvanceBalance: employee.openingAdvanceBalance || 0,
        },
        summary: {
            openingBalance: employee.openingAdvanceBalance || 0,
            totalAdvance, totalReturned, totalDeducted,
            closingBalance: (employee.openingAdvanceBalance || 0) + totalAdvance - totalReturned - totalDeducted,
        },
        ledger,
        advances, // dùng để chọn "khoản tạm ứng cần hoàn ứng" trên UI
    });
}, { roles: VIEW_ROLES });
