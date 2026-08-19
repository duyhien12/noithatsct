import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { withCodeRetry } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { supplierCreateSchema } from '@/lib/validations/supplier';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const search = searchParams.get('search');
    const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};

    const [data, total, poStats] = await Promise.all([
        prisma.supplier.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.supplier.count({ where }),
        prisma.purchaseOrder.groupBy({
            by: ['supplierId'],
            _sum: { totalAmount: true, paidAmount: true },
            where: { supplierId: { not: null } },
        }),
    ]);
    const statsMap = {};
    poStats.forEach(s => { if (s.supplierId) statsMap[s.supplierId] = s._sum; });
    const dataWithStats = data.map(s => ({
        ...s,
        totalPurchase: statsMap[s.id]?.totalAmount || 0,
        totalPaid: statsMap[s.id]?.paidAmount || 0,
        debt: (statsMap[s.id]?.totalAmount || 0) - (statsMap[s.id]?.paidAmount || 0),
    }));
    return NextResponse.json(paginatedResponse(dataWithStats, total, { page, limit }));
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = supplierCreateSchema.parse(body);
    const supplier = await withCodeRetry('supplier', 'NCC', (code) =>
        prisma.supplier.create({ data: { code, ...data } })
    );
    return NextResponse.json(supplier, { status: 201 });
});
