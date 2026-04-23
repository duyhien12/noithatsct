import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const LARK_API = 'https://open.larksuite.com/open-apis';
const APP_TOKEN = 'LjZObg4Eia0EowslkYclsCE9gVh';
const TABLE_ID = 'tbln24uOGLOQGBd5';

async function getTenantToken() {
    const res = await fetch(`${LARK_API}/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: process.env.LARK_APP_ID,
            app_secret: process.env.LARK_APP_SECRET,
        }),
    });
    const data = await res.json();
    if (!data.tenant_access_token) throw new Error('Không lấy được Lark token: ' + JSON.stringify(data));
    return data.tenant_access_token;
}

function parseFieldValue(val) {
    if (val === null || val === undefined) return null;
    // Number
    if (typeof val === 'number') return val;
    // String
    if (typeof val === 'string') return val;
    // Date field: { type: 5, value: timestamp_ms }
    if (val?.type === 5 && val?.value) return new Date(val.value);
    // Array of text segments
    if (Array.isArray(val)) {
        return val.map(v => v?.text || v?.mention_text || String(v)).join('');
    }
    // Option/Select: { text: "..." }
    if (val?.text) return val.text;
    return null;
}

function parseNumber(val) {
    const v = parseFieldValue(val);
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
}

function parseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    const v = parseFieldValue(val);
    if (!v) return null;
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}

async function fetchAllRecords(token) {
    const records = [];
    let pageToken = null;

    do {
        const params = new URLSearchParams({ page_size: '500' });
        if (pageToken) params.set('page_token', pageToken);

        const res = await fetch(
            `${LARK_API}/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();

        if (data.code !== 0) throw new Error('Lark API error: ' + JSON.stringify(data));

        records.push(...(data.data?.items || []));
        pageToken = data.data?.has_more ? data.data.page_token : null;
    } while (pageToken);

    return records;
}

// POST /api/finance/lark-bulk-sync — chỉ admin mới chạy được
export const POST = withAuth(async () => {
    const token = await getTenantToken();
    const records = await fetchAllRecords(token);

    let synced = 0;
    for (const rec of records) {
        const f = rec.fields || {};
        try {
            await prisma.larkJournalEntry.upsert({
                where: { larkRecordId: rec.record_id },
                update: {
                    entryDate: parseDate(f['Ngày tháng Dương'] ?? f['Ngày tháng...']),
                    postDate: parseDate(f['Ngày tháng Âm']),
                    category: String(parseFieldValue(f['Chi tiết']) || ''),
                    description: String(parseFieldValue(f['Mô tả chi tiết']) || ''),
                    department: String(parseFieldValue(f['Phòng ban']) || ''),
                    cashIn: parseNumber(f['Thu TM']),
                    cashOut: parseNumber(f['Chi TM']),
                    bankIn: parseNumber(f['Thu TGNH']),
                    bankOut: parseNumber(f['Chi TGNH']),
                    rawData: f,
                },
                create: {
                    larkRecordId: rec.record_id,
                    entryDate: parseDate(f['Ngày tháng Dương'] ?? f['Ngày tháng...']),
                    postDate: parseDate(f['Ngày tháng Âm']),
                    category: String(parseFieldValue(f['Chi tiết']) || ''),
                    description: String(parseFieldValue(f['Mô tả chi tiết']) || ''),
                    department: String(parseFieldValue(f['Phòng ban']) || ''),
                    cashIn: parseNumber(f['Thu TM']),
                    cashOut: parseNumber(f['Chi TM']),
                    bankIn: parseNumber(f['Thu TGNH']),
                    bankOut: parseNumber(f['Chi TGNH']),
                    rawData: f,
                },
            });
            synced++;
        } catch {
            // bỏ qua record lỗi, tiếp tục
        }
    }

    return NextResponse.json({ total: records.length, synced });
}, { roles: ['giam_doc', 'pho_gd', 'ke_toan', 'admin'] });
