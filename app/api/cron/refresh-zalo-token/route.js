import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { saveZaloTokens } from '@/lib/zalo';

function checkSecret(request) {
    const secret = request.headers.get('x-cron-secret');
    return secret === process.env.CRON_SECRET;
}

/**
 * GET /api/cron/refresh-zalo-token
 * Tự động làm mới Zalo OA Access Token và lưu vào DB
 * Được gọi định kỳ qua GitHub Actions cron (mỗi 85 ngày)
 */
export async function GET(request) {
    if (!checkSecret(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appId = process.env.ZALO_APP_ID;
    const appSecret = process.env.ZALO_APP_SECRET;

    if (!appId || !appSecret) {
        return NextResponse.json({ error: 'Thiếu ZALO_APP_ID / ZALO_APP_SECRET' }, { status: 500 });
    }

    // Lấy refresh token từ DB trước, fallback env
    let refreshToken = null;
    try {
        const setting = await prisma.setting.findUnique({ where: { key: 'ZALO_OA_REFRESH_TOKEN' } });
        refreshToken = setting?.value || process.env.ZALO_OA_REFRESH_TOKEN || null;
    } catch {
        refreshToken = process.env.ZALO_OA_REFRESH_TOKEN || null;
    }

    if (!refreshToken) {
        return NextResponse.json({ error: 'Không có ZALO_OA_REFRESH_TOKEN. Vui lòng kết nối lại qua OAuth.' }, { status: 500 });
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

        const expiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : '';

        // Lưu token mới vào DB
        await saveZaloTokens({
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken,
            expiresAt,
        });

        return NextResponse.json({
            success: true,
            message: 'Token đã được làm mới và lưu vào DB thành công.',
            expires_at: expiresAt,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
