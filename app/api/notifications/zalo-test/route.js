import { withAuth } from '@/lib/apiHandler';
import { sendZaloMessage } from '@/lib/zalo';
import { NextResponse } from 'next/server';

/**
 * POST /api/notifications/zalo-test
 * Test gửi tin Zalo đến một user cụ thể (chỉ admin)
 * Body: { zaloUserId, message }
 */
export const POST = withAuth(async (request) => {
    const { zaloUserId, message } = await request.json();
    if (!zaloUserId) return NextResponse.json({ error: 'Thiếu zaloUserId' }, { status: 400 });

    const text = message || '🏠 Đây là tin nhắn test từ hệ thống Nội Thất SCT!';
    const result = await sendZaloMessage(zaloUserId, text);

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
