import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { CREATE_ROLES } from '@/lib/payable';

// Xóa 1 khoản "Ghi nợ mua hàng" (PayableEntry) — không liên kết Nhật ký/PaymentAllocation nên
// xóa thẳng, không ảnh hưởng dòng tiền nào.
export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.payableEntry.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy khoản ghi nợ' }, { status: 404 });

    await prisma.payableEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: CREATE_ROLES });
