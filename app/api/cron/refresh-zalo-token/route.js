import { NextResponse } from 'next/server';
import { refreshZaloToken } from '@/lib/zalo';

function checkSecret(request) {
    const secret = request.headers.get('x-cron-secret');
    return secret === process.env.CRON_SECRET;
}

/**
 * GET /api/cron/refresh-zalo-token
 * Làm mới Zalo OA Access Token và lưu vào DB.
 * Được gọi qua GitHub Actions cron (mỗi 85 ngày) hoặc nút "Làm mới token" trên UI.
 */
export async function GET(request) {
    if (!checkSecret(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { accessToken, expiresAt } = await refreshZaloToken();
        return NextResponse.json({
            success: true,
            message: 'Token đã được làm mới và lưu vào DB thành công.',
            expires_at: expiresAt,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
