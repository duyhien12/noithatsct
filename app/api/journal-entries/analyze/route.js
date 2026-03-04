import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { analyzeJournalText } from '@/lib/geminiJournal';

export const POST = withAuth(async (request) => {
    const { rawInput } = await request.json();
    if (!rawInput?.trim()) {
        return NextResponse.json({ error: 'rawInput bắt buộc' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: 'GEMINI_API_KEY chưa cấu hình' }, { status: 500 });
    }

    try {
        const result = await analyzeJournalText(rawInput);
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
});
