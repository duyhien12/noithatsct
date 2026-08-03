import Anthropic from '@anthropic-ai/sdk';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { canUseDocumentAssistant } from '@/lib/aiAssistant/permissions';
import { DOCUMENT_ASSISTANT_BASE_SYSTEM_PROMPT, getDocumentTemplate } from '@/lib/aiAssistant/documentTemplates';
import { buildAttachmentBlocks } from '@/lib/aiAssistant/attachments';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-5';

async function buildProjectContext(projectId) {
    if (!projectId) return '';
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { customer: true },
    });
    if (!project) return '';
    return `Thông tin công trình (lấy từ hệ thống, dùng đúng số liệu này, không thay đổi):
- Mã công trình: ${project.code}
- Tên công trình: ${project.name}
- Địa chỉ: ${project.address || '(chưa có trong hệ thống)'}
- Khách hàng: ${project.customer?.name || '(chưa có trong hệ thống)'}
- Loại công trình: ${project.type || '(chưa rõ)'}
- Trạng thái hiện tại: ${project.status}`;
}

export const POST = withAuth(async (request, _ctx, session) => {
    if (!canUseDocumentAssistant(session.user.email)) {
        return NextResponse.json({ error: 'Tính năng này hiện chỉ dành cho một số tài khoản được cấp quyền.' }, { status: 403 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'Lỗi cấu hình: ANTHROPIC_API_KEY chưa được thiết lập' }, { status: 500 });
    }

    const body = await request.json();
    const docType = (body.docType || '').trim();
    const userInput = (body.userInput || '').trim();
    const projectId = body.projectId || null;
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    const template = getDocumentTemplate(docType);
    if (!template) {
        return NextResponse.json({ error: 'Loại hồ sơ không hợp lệ' }, { status: 400 });
    }
    if (!userInput) {
        return NextResponse.json({ error: 'Vui lòng nhập thông tin/yêu cầu cụ thể' }, { status: 400 });
    }

    let attachmentBlocks;
    try {
        attachmentBlocks = buildAttachmentBlocks(attachments);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    try {
        const projectContext = await buildProjectContext(projectId);
        const system = `${DOCUMENT_ASSISTANT_BASE_SYSTEM_PROMPT}\n\nLoại hồ sơ cần soạn: ${template.label}\n${template.template}`;

        const userMessage = [projectContext, `Yêu cầu của người dùng:\n${userInput}`]
            .filter(Boolean)
            .join('\n\n');

        const content = attachmentBlocks.length > 0
            ? [...attachmentBlocks, { type: 'text', text: userMessage }]
            : userMessage;

        const response = await client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system,
            messages: [{ role: 'user', content }],
        });

        const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();

        await prisma.aiLog.create({
            data: {
                userId: session.user.id || '',
                userName: session.user.name || '',
                userRole: session.user.role || '',
                question: `[document-assistant:${docType}]${attachments.length ? ` [${attachments.length} tệp đính kèm]` : ''} ${userInput}`,
                answer: text,
                toolCalls: [],
                actions: [],
            },
        });

        return NextResponse.json({ result: text });
    } catch (err) {
        console.error('[AI document-assistant]', err);
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
