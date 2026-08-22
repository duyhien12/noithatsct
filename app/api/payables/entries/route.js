import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { CREATE_ROLES } from '@/lib/payable';

// "+ Ghi nợ mua hàng" — mua chịu, CHƯA trả tiền. Tạo PayableEntry (bảng mới, KHÔNG phải
// PurchaseOrder) — không đụng Nhật ký Thu – Chi (không có tiền thật di chuyển).
export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const supplierId = String(body.supplierId || '');
    const amount = Number(body.amount);
    if (!supplierId) return NextResponse.json({ error: 'Vui lòng chọn NCC' }, { status: 400 });
    if (!(amount > 0)) return NextResponse.json({ error: 'Số tiền phải lớn hơn 0' }, { status: 400 });

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
    if (!supplier) return NextResponse.json({ error: 'Không tìm thấy NCC' }, { status: 404 });

    const entry = await withCodeRetry('payableEntry', 'GN', (code) =>
        prisma.payableEntry.create({
            data: {
                code, supplierId, amount,
                date: body.date ? new Date(body.date) : new Date(),
                content: body.content || '',
                projectId: body.projectId || null,
                attachments: Array.isArray(body.attachments) ? body.attachments : [],
                createdBy: session.user.name,
            },
        }), 5
    );
    return NextResponse.json(entry, { status: 201 });
}, { roles: CREATE_ROLES });
