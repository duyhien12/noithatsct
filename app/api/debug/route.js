import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const GET = async () => {
    const results = {};

    // Test 1: DB connection
    try {
        await prisma.$queryRaw`SELECT 1 as ok`;
        results.connection = 'OK';
    } catch (e) {
        results.connection = e.message;
        return NextResponse.json(results);
    }

    // Test 2: Customer table columns
    try {
        const cols = await prisma.$queryRaw`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'Customer' AND table_schema = 'public'
            ORDER BY column_name
        `;
        results.customerColumns = cols.map(c => c.column_name);
    } catch (e) {
        results.customerColumns = 'ERROR: ' + e.message;
    }

    // Test 3: Simple customer query
    try {
        const count = await prisma.$queryRaw`SELECT COUNT(*) as n FROM "Customer"`;
        results.customerCount = count[0].n?.toString();
    } catch (e) {
        results.customerQueryError = e.message;
    }

    // Test 4: Prisma customer.count()
    try {
        const n = await prisma.customer.count();
        results.prismaCustomerCount = n;
    } catch (e) {
        results.prismaCustomerCountError = e.message;
    }

    return NextResponse.json(results, { status: 200 });
};
