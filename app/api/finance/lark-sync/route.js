import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function parseVND(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
}

function parseDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

// POST /api/finance/lark-sync
// Lark Base Automation gọi endpoint này khi có record mới/thay đổi
export async function POST(request) {
    const secret = request.headers.get('x-webhook-secret');
    if (secret !== process.env.LARK_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const records = Array.isArray(body) ? body : [body];
    const results = [];

    for (const record of records) {
        const {
            record_id,
            entry_date,
            post_date,
            category,
            description,
            department,
            cash_in,
            cash_out,
            bank_in,
            bank_out,
        } = record;

        if (!record_id) continue;

        const entry = await prisma.larkJournalEntry.upsert({
            where: { larkRecordId: record_id },
            update: {
                entryDate: parseDate(entry_date),
                postDate: parseDate(post_date),
                category: category || '',
                description: description || '',
                department: department || '',
                cashIn: parseVND(cash_in),
                cashOut: parseVND(cash_out),
                bankIn: parseVND(bank_in),
                bankOut: parseVND(bank_out),
                rawData: record,
            },
            create: {
                larkRecordId: record_id,
                entryDate: parseDate(entry_date),
                postDate: parseDate(post_date),
                category: category || '',
                description: description || '',
                department: department || '',
                cashIn: parseVND(cash_in),
                cashOut: parseVND(cash_out),
                bankIn: parseVND(bank_in),
                bankOut: parseVND(bank_out),
                rawData: record,
            },
        });
        results.push(entry.id);
    }

    return NextResponse.json({ synced: results.length, ids: results });
}
