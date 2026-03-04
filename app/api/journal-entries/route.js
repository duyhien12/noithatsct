import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { analyzeJournalText } from '@/lib/geminiJournal';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const entries = await prisma.journalEntry.findMany({
        where: { projectId },
        include: { commitments: true },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(entries);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { projectId, rawInput, source = 'paste', createdBy = '', useAI = true } = body;
    if (!projectId || !rawInput?.trim()) {
        return NextResponse.json({ error: 'projectId và rawInput bắt buộc' }, { status: 400 });
    }

    let aiSummary = null;
    let aiRaw = null;
    let aiCommitments = [];

    if (useAI && process.env.GEMINI_API_KEY) {
        try {
            const result = await analyzeJournalText(rawInput);
            aiSummary = result.summary || null;
            aiRaw = result;
            aiCommitments = result.commitments || [];
        } catch (err) {
            console.error('AI analysis failed:', err.message);
            // Continue without AI — still save the entry
        }
    }

    const entry = await prisma.journalEntry.create({
        data: {
            projectId,
            source,
            rawInput,
            aiSummary,
            aiRaw,
            createdBy,
            commitments: {
                create: aiCommitments.map(c => ({
                    projectId,
                    title: c.title || 'Không rõ',
                    type: c.type || 'request',
                    assignee: c.assignee || '',
                    deadline: c.deadline ? new Date(c.deadline) : null,
                    notes: c.notes || '',
                    status: 'pending',
                })),
            },
        },
        include: { commitments: true },
    });

    return NextResponse.json(entry);
});
