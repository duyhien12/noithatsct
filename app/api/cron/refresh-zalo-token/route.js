import { NextResponse } from 'next/server';

function checkSecret(request) {
    const secret = request.headers.get('x-cron-secret');
    return secret === process.env.CRON_SECRET;
}

/**
 * GET /api/cron/refresh-zalo-token
 * Gọi định kỳ để làm mới Zalo OA Access Token trước khi hết hạn
 * Zalo cấp refresh token có hiệu lực 3 tháng
 */
export async function GET(request) {
    if (!checkSecret(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appId = process.env.ZALO_APP_ID;
    const appSecret = process.env.ZALO_APP_SECRET;
    const refreshToken = process.env.ZALO_OA_REFRESH_TOKEN;

    if (!appId || !appSecret || !refreshToken) {
        return NextResponse.json({ error: 'Thiếu ZALO_APP_ID / ZALO_APP_SECRET / ZALO_OA_REFRESH_TOKEN' }, { status: 500 });
    }

    try {
        const params = new URLSearchParams({
            app_id: appId,
            app_secret: appSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });

        const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'secret_key': appSecret,
            },
            body: params.toString(),
        });

        const data = await res.json();

        if (!data.access_token) {
            return NextResponse.json({ error: 'Zalo trả về lỗi', detail: data }, { status: 500 });
        }

        // Token mới — cần cập nhật GitHub Secrets thủ công hoặc qua API
        // Hiển thị để admin biết cần cập nhật
        return NextResponse.json({
            success: true,
            message: 'Token mới đã được tạo. Vui lòng cập nhật GitHub Secrets.',
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            expires_at: new Date(Date.now() + (data.expires_in || 0) * 1000).toISOString(),
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
