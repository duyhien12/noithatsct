import { NextResponse } from 'next/server';

/**
 * GET /api/auth/zalo-oa/callback
 * Zalo OA OAuth callback - nhận code từ Zalo, đổi lấy access_token
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return new NextResponse(
            `<html><body style="font-family:sans-serif;padding:40px">
                <h2 style="color:red">❌ Lỗi xác thực Zalo OA</h2>
                <p>${error}</p>
                <a href="/hr/accounts">← Quay lại</a>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }

    if (!code) {
        return new NextResponse(
            `<html><body style="font-family:sans-serif;padding:40px">
                <h2 style="color:orange">⚠️ Không có code</h2>
                <p>Zalo không trả về authorization code.</p>
                <a href="/hr/accounts">← Quay lại</a>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }

    // Đổi code lấy access_token
    const appId = process.env.ZALO_APP_ID;
    const appSecret = process.env.ZALO_APP_SECRET;

    if (!appId || !appSecret) {
        return new NextResponse(
            `<html><body style="font-family:sans-serif;padding:40px">
                <h2 style="color:red">❌ Chưa cấu hình ZALO_APP_ID / ZALO_APP_SECRET</h2>
                <p>Vui lòng thêm vào file .env</p>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
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
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'secret_key': appSecret },
            body: params.toString(),
        });

        const data = await res.json();

        if (data.error !== 0) {
            return new NextResponse(
                `<html><body style="font-family:sans-serif;padding:40px">
                    <h2 style="color:red">❌ Lỗi lấy token</h2>
                    <p>Error ${data.error}: ${data.message}</p>
                </body></html>`,
                { headers: { 'Content-Type': 'text/html' } }
            );
        }

        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;
        const expiresIn = data.expires_in;
        const expireDate = new Date(Date.now() + expiresIn * 1000).toLocaleString('vi-VN');

        return new NextResponse(
            `<html>
            <head><title>Zalo OA Token</title></head>
            <body style="font-family:sans-serif;padding:40px;max-width:700px;margin:auto">
                <h2 style="color:green">✅ Lấy Access Token thành công!</h2>
                <p>Sao chép các giá trị bên dưới và dán vào file <code>.env</code> của project:</p>

                <div style="background:#f4f4f4;border:1px solid #ddd;border-radius:8px;padding:20px;margin:20px 0">
                    <p><strong>ZALO_OA_ACCESS_TOKEN</strong></p>
                    <textarea rows="3" style="width:100%;font-family:monospace;font-size:12px;padding:8px" onclick="this.select()">${accessToken}</textarea>

                    <p style="margin-top:16px"><strong>ZALO_OA_REFRESH_TOKEN</strong></p>
                    <textarea rows="3" style="width:100%;font-family:monospace;font-size:12px;padding:8px" onclick="this.select()">${refreshToken}</textarea>

                    <p style="margin-top:16px;color:#666;font-size:13px">
                        ⏰ Token hết hạn lúc: <strong>${expireDate}</strong> (${Math.round(expiresIn / 3600)} giờ)
                    </p>
                </div>

                <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin:20px 0">
                    <strong>📋 Dán vào file .env:</strong>
                    <pre style="margin:10px 0;font-size:12px">ZALO_OA_ACCESS_TOKEN="${accessToken}"
ZALO_OA_REFRESH_TOKEN="${refreshToken}"</pre>
                </div>

                <a href="/hr/accounts" style="display:inline-block;padding:10px 20px;background:#1877f2;color:white;border-radius:6px;text-decoration:none">
                    ← Quay lại quản lý tài khoản
                </a>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    } catch (err) {
        return new NextResponse(
            `<html><body style="font-family:sans-serif;padding:40px">
                <h2 style="color:red">❌ Lỗi kết nối</h2>
                <p>${err.message}</p>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
}
