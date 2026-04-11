import { NextResponse } from 'next/server';
import { saveZaloTokens } from '@/lib/zalo';

/**
 * GET /api/auth/zalo-oa/callback
 * Zalo OA OAuth callback - nhận code từ Zalo, đổi lấy access_token rồi tự lưu vào DB
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return htmlResponse(`
            <h2 style="color:red">❌ Lỗi xác thực Zalo OA</h2>
            <p>${error}</p>
            <a href="/hr/accounts">← Quay lại</a>
        `);
    }

    if (!code) {
        return htmlResponse(`
            <h2 style="color:orange">⚠️ Không có code</h2>
            <p>Zalo không trả về authorization code.</p>
            <a href="/hr/accounts">← Quay lại</a>
        `);
    }

    const appId = process.env.ZALO_APP_ID;
    const appSecret = process.env.ZALO_APP_SECRET;

    if (!appId || !appSecret) {
        return htmlResponse(`
            <h2 style="color:red">❌ Chưa cấu hình ZALO_APP_ID / ZALO_APP_SECRET</h2>
            <p>Vui lòng thêm vào file .env và deploy lại.</p>
        `);
    }

    try {
        const params = new URLSearchParams({
            app_id: appId,
            app_secret: appSecret,
            code,
            grant_type: 'authorization_code',
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
            return htmlResponse(`
                <h2 style="color:red">❌ Lỗi lấy token</h2>
                <pre style="background:#f4f4f4;padding:16px;border-radius:6px;overflow:auto">${JSON.stringify(data, null, 2)}</pre>
                <p><a href="javascript:history.back()">← Thử lại</a></p>
            `);
        }

        const accessToken = data.access_token;
        const refreshToken = data.refresh_token || '';
        const expiresIn = data.expires_in || 0;
        const expiresAt = expiresIn
            ? new Date(Date.now() + expiresIn * 1000).toISOString()
            : '';

        // Tự động lưu vào DB
        await saveZaloTokens({ accessToken, refreshToken, expiresAt });

        const expireDisplay = expiresAt
            ? new Date(expiresAt).toLocaleString('vi-VN')
            : 'Không xác định';

        return htmlResponse(`
            <h2 style="color:green">✅ Kết nối Zalo OA thành công!</h2>
            <p>Token đã được lưu tự động vào hệ thống.</p>

            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:0;font-size:14px">⏰ Token hết hạn: <strong>${expireDisplay}</strong></p>
                ${refreshToken ? '<p style="margin:4px 0 0;font-size:13px;color:#16a34a">✓ Refresh token đã lưu — hệ thống sẽ tự gia hạn</p>' : ''}
            </div>

            <a href="/hr/accounts" style="display:inline-block;padding:10px 20px;background:#1877f2;color:white;border-radius:6px;text-decoration:none;margin-top:8px">
                ← Quay lại quản lý tài khoản
            </a>
        `);
    } catch (err) {
        return htmlResponse(`
            <h2 style="color:red">❌ Lỗi kết nối</h2>
            <p>${err.message}</p>
        `);
    }
}

function htmlResponse(body) {
    return new NextResponse(
        `<html>
        <head><title>Zalo OA</title><meta charset="utf-8"></head>
        <body style="font-family:sans-serif;padding:40px;max-width:600px;margin:auto">
            ${body}
        </body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}
