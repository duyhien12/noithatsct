import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { CREATE_ROLES } from '@/lib/receivable';

// "+ Ghi nợ bán hàng" — bán chịu, CHƯA thu tiền. Tạo ReceivableEntry (bảng mới, KHÔNG phải
// ContractPayment) — không đụng Nhật ký Thu – Chi (không có tiền thật di chuyển). Hợp đồng là
// tùy chọn — chỉ cần khách hàng.
export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const customerId = String(body.customerId || '');
    const amount = Number(body.amount);
    if (!customerId) return NextResponse.json({ error: 'Vui lòng chọn khách hàng' }, { status: 400 });
    if (!(amount > 0)) return NextResponse.json({ error: 'Số tiền phải lớn hơn 0' }, { status: 400 });

    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });

    if (body.contractId) {
        const contract = await prisma.contract.findUnique({ where: { id: body.contractId }, select: { customerId: true } });
        if (!contract || contract.customerId !== customerId) {
            return NextResponse.json({ error: 'Hợp đồng không thuộc khách hàng này' }, { status: 400 });
        }
    }

    const entry = await withCodeRetry('receivableEntry', 'GN', (code) =>
        prisma.receivableEntry.create({
            data: {
                code, customerId, amount,
                date: body.date ? new Date(body.date) : new Date(),
                content: body.content || '',
                contractId: body.contractId || null,
                attachments: Array.isArray(body.attachments) ? body.attachments : [],
                createdBy: session.user.name,
            },
        }), 5
    );
    return NextResponse.json(entry, { status: 201 });
}, { roles: CREATE_ROLES });
