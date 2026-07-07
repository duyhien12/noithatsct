import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getScope, SCOPE_TOOLS, SCOPE_SYSTEM_PROMPT, canCreateTask, canCreateReport, canUseAIAssistant } from '@/lib/aiAssistant/permissions';
import { getToolsForNames, dispatchTool } from '@/lib/aiAssistant/tools';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOOL_ROUNDS = 5;

const BASE_SYSTEM_PROMPT = `Bạn là Trợ lý AI của Nội Thất SCT, hỗ trợ nhân viên tra cứu dự án, tiến độ, đơn hàng xưởng, thu tiền, chi phí, công nợ ngay trên trang Dự án & Tiến độ.

Quy tắc bắt buộc:
- Luôn dùng tiếng Việt, ngắn gọn, rõ ràng, không dùng markdown nặng (không **, không ##).
- CHỈ trả lời dựa trên dữ liệu lấy được từ công cụ (tool). Không tự bịa số liệu.
- Nếu công cụ trả về lỗi/không có quyền, hãy giải thích lý do một cách lịch sự, không cố lách qua.
- Khi dùng createTaskDraft hoặc createReportDraft: LUÔN nói rõ đây là BẢN NHÁP, người dùng cần bấm xác nhận trên giao diện để hoàn tất — bạn không tự lưu vào hệ thống.
- Nếu câu hỏi không đủ thông tin (vd thiếu tên dự án), hãy hỏi lại thay vì đoán.`;

async function buildToolResultBlocks(toolUseBlocks, ctx, trace, pendingActions) {
    const results = [];
    for (const block of toolUseBlocks) {
        const output = await dispatchTool(block.name, block.input, ctx);
        trace.push({ name: block.name, input: block.input, output });
        if (output && (output.kind === 'task' || output.kind === 'report')) {
            const draftId = randomUUID();
            pendingActions.push({ draftId, ...output, executed: false });
            results.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify({ ...output, draftId, note: 'Đây là bản nháp — chưa lưu vào hệ thống, cần người dùng xác nhận trên giao diện.' }),
            });
        } else {
            results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(output) });
        }
    }
    return results;
}

const MAX_HISTORY_MESSAGES = 20; // ~10 lượt hỏi-đáp gần nhất

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    const cleaned = history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .slice(-MAX_HISTORY_MESSAGES)
        .map(m => ({ role: m.role, content: m.content.trim().slice(0, 4000) }));
    while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
    return cleaned;
}

async function runChat({ message, history, session }) {
    const role = session.user.role;
    const scope = getScope(role);
    const ctx = { scope, userName: session.user.name || '' };
    const tools = getToolsForNames(SCOPE_TOOLS[scope] || []).map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
    const system = `${BASE_SYSTEM_PROMPT}\n\nPhạm vi quyền của người dùng hiện tại (vai trò: ${role}): ${SCOPE_SYSTEM_PROMPT[scope]}`;

    const messages = [...sanitizeHistory(history), { role: 'user', content: message }];
    const trace = [];
    const pendingActions = [];
    let finalText = '';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await client.messages.create({
            model: MODEL,
            max_tokens: 1024,
            system,
            tools,
            messages,
        });

        const textBlocks = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        if (textBlocks) finalText = textBlocks;

        if (response.stop_reason !== 'tool_use') break;

        messages.push({ role: 'assistant', content: response.content });
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
        const toolResults = await buildToolResultBlocks(toolUseBlocks, ctx, trace, pendingActions);
        messages.push({ role: 'user', content: toolResults });
    }

    if (!finalText) finalText = 'Xin lỗi, tôi chưa thể trả lời câu hỏi này. Vui lòng thử diễn đạt khác.';

    const log = await prisma.aiLog.create({
        data: {
            userId: session.user.id || '',
            userName: session.user.name || '',
            userRole: role || '',
            question: message,
            answer: finalText,
            toolCalls: trace,
            actions: pendingActions,
        },
    });

    return NextResponse.json({
        answer: finalText,
        pendingActions: pendingActions.map(a => ({ ...a, logId: log.id })),
        logId: log.id,
    });
}

async function runConfirm({ confirm, session }) {
    const { logId, draftId } = confirm || {};
    if (!logId || !draftId) return NextResponse.json({ error: 'Thiếu logId/draftId' }, { status: 400 });

    const log = await prisma.aiLog.findUnique({ where: { id: logId } });
    if (!log) return NextResponse.json({ error: 'Không tìm thấy phiên trợ lý AI' }, { status: 404 });

    const actions = Array.isArray(log.actions) ? log.actions : [];
    const idx = actions.findIndex(a => a.draftId === draftId);
    if (idx === -1) return NextResponse.json({ error: 'Không tìm thấy bản nháp' }, { status: 404 });
    if (actions[idx].executed) return NextResponse.json({ error: 'Bản nháp này đã được xác nhận trước đó' }, { status: 409 });

    const action = actions[idx];
    const scope = getScope(session.user.role);

    if (action.kind === 'task') {
        if (!canCreateTask(scope)) return NextResponse.json({ error: 'Bạn không có quyền tạo tác vụ' }, { status: 403 });
        const task = await prisma.task.create({
            data: {
                title: action.title,
                description: action.projectRef ? `Dự án: ${action.projectRef.code} - ${action.projectRef.name}` : '',
                status: action.status || 'Việc sẽ làm',
                priority: action.priority || 'Trung bình',
                assignee: '',
                createdBy: session.user.name || '',
            },
        });
        actions[idx] = { ...action, executed: true, executedAt: new Date().toISOString() };
        await prisma.aiLog.update({ where: { id: logId }, data: { actions } });
        return NextResponse.json({ success: true, message: 'Đã tạo tác vụ.', task });
    }

    if (action.kind === 'report') {
        if (!canCreateReport(scope, action.type)) return NextResponse.json({ error: 'Bạn không có quyền tạo báo cáo này' }, { status: 403 });
        actions[idx] = { ...action, executed: true, executedAt: new Date().toISOString() };
        await prisma.aiLog.update({ where: { id: logId }, data: { actions } });
        return NextResponse.json({ success: true, message: 'Đã chốt nội dung báo cáo.', content: action.content });
    }

    return NextResponse.json({ error: 'Loại bản nháp không hợp lệ' }, { status: 400 });
}

export const POST = withAuth(async (request, _ctx, session) => {
    if (!canUseAIAssistant(session.user.email)) {
        return NextResponse.json({ error: 'Tính năng này hiện chỉ dành cho một số tài khoản được cấp quyền.' }, { status: 403 });
    }

    const body = await request.json();

    if (body.confirm) {
        return runConfirm({ confirm: body.confirm, session });
    }

    const message = (body.message || '').trim();
    if (!message) return NextResponse.json({ error: 'Vui lòng nhập câu hỏi' }, { status: 400 });
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'Lỗi cấu hình: ANTHROPIC_API_KEY chưa được thiết lập' }, { status: 500 });
    }

    try {
        return await runChat({ message, history: body.history, session });
    } catch (err) {
        console.error('[AI project-assistant]', err);
        const msg = err?.message || '';
        if (msg.includes('401') || msg.includes('authentication')) {
            return NextResponse.json({ error: 'Lỗi xác thực API key AI.' }, { status: 500 });
        }
        if (msg.includes('credit') || msg.includes('billing') || msg.includes('402')) {
            return NextResponse.json({ error: 'Tài khoản AI hết credit, vui lòng liên hệ quản trị viên.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Có lỗi khi xử lý yêu cầu AI. Vui lòng thử lại.' }, { status: 500 });
    }
});
