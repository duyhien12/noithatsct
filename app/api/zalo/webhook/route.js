/**
 * POST/GET /api/zalo/webhook
 *
 * Webhook nhận tin nhắn từ Zalo OA.
 * - GET  : xác minh webhook (Zalo gửi hub.challenge)
 * - POST : xử lý sự kiện tin nhắn đến (có xác minh HMAC-SHA256)
 */
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { sendZaloMessage } from '@/lib/zalo';
import { handleBossMessage, isBoss } from '@/lib/zaloBot';

/**
 * Xác minh chữ ký HMAC-SHA256 từ Zalo.
 * Zalo ký body bằng app_secret và gửi qua header X-Zalo-Signature.
 */
function verifyZaloSignature(rawBody, signature) {
    const appSecret = process.env.ZALO_APP_SECRET;
    if (!appSecret) {
        // Nếu chưa cấu hình secret → từ chối luôn để tránh bypass
        console.warn('[Zalo Webhook] ZALO_APP_SECRET chưa được cấu hình');
        return false;
    }
    if (!signature) return false;

    const expected = createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

    // So sánh constant-time để chống timing attack
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
}

// ─── Webhook Verification (GET) ───────────────────────────────────────────────

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('hub.challenge');
    if (challenge) {
        // Zalo gửi challenge để xác minh URL
        return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ status: 'Zalo webhook active' });
}

// ─── Message Handler (POST) ───────────────────────────────────────────────────

export async function POST(request) {
    // Đọc raw body để verify chữ ký HMAC
    const rawBody = await request.text();

    // Body rỗng hoặc không phải JSON (Zalo test ping) → trả 200 luôn
    if (!rawBody) return NextResponse.json({ error: 0 });

    // Xác minh chữ ký HMAC-SHA256 từ Zalo
    const signature = request.headers.get('x-zalo-signature');
    if (!verifyZaloSignature(rawBody, signature)) {
        console.warn('[Zalo Webhook] Chữ ký HMAC không hợp lệ — bỏ qua request');
        // Trả 200 để Zalo không retry liên tục, nhưng không xử lý
        return NextResponse.json({ error: 0 });
    }

    let event;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 0 });
    }

    // Zalo có thể gửi array hoặc object
    const events = Array.isArray(event) ? event : [event];

    // Xử lý bất đồng bộ, không block response
    processEvents(events).catch((err) => console.error('[Zalo Webhook] processEvents error:', err));

    // Phải trả 200 ngay để Zalo không retry
    return NextResponse.json({ error: 0 });
}

// ─── Process Events ───────────────────────────────────────────────────────────

async function processEvents(events) {
    for (const ev of events) {
        const eventName = ev.event_name || ev.event_type || '';

        // Chỉ xử lý tin nhắn text
        if (eventName !== 'user_send_text' && eventName !== 'oa_send_text') continue;
        // Bỏ qua tin nhắn do OA gửi (tránh vòng lặp)
        if (eventName === 'oa_send_text') continue;

        const senderZaloId = ev.sender?.id;
        const messageText = ev.message?.text?.trim();

        if (!senderZaloId || !messageText) continue;

        console.log(`[Zalo Webhook] Tin từ ${senderZaloId}: "${messageText}"`);

        // Kiểm tra có phải sếp không
        const bossOk = await isBoss(senderZaloId);
        if (!bossOk) {
            console.log(`[Zalo Webhook] Bỏ qua — ${senderZaloId} không phải sếp`);
            // Có thể gửi thông báo lịch sự
            await sendZaloMessage(
                senderZaloId,
                'Xin lỗi, tôi chỉ hỗ trợ trả lời ban giám đốc công ty.'
            ).catch(() => {});
            continue;
        }

        // Gọi AI xử lý câu hỏi
        const reply = await handleBossMessage(messageText);

        // Gửi câu trả lời về
        const result = await sendZaloMessage(senderZaloId, reply);
        if (!result?.success) {
            console.error('[Zalo Webhook] Gửi trả lời thất bại:', result);
        }
    }
}
