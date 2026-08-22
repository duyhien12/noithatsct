import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { CREATE_ROLES } from '@/lib/receivable';

// Xóa 1 khoản "Ghi nợ bán hàng" (ReceivableEntry) — không liên kết Nhật ký/PaymentAllocation nên
// xóa thẳng, không ảnh hưởng dòng tiền nào.
export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.receivableEntry.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy khoản ghi nợ' }, { status: 404 });

    await prisma.receivableEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { roles: CREATE_ROLES });
