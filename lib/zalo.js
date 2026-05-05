/**
 * Zalo Official Account (OA) notification utility
 * Docs: https://developers.zalo.me/docs/official-account/tin-nhan/gui-tin-nhan-van-ban
 */

import prisma from './prisma';

const ZALO_OA_API = 'https://openapi.zalo.me/v3.0/oa/message/cs';
const AUTO_REFRESH_DAYS = 7; // Tự động refresh khi còn ít hơn 7 ngày

let _refreshing = false;

/**
 * Gọi Zalo OAuth để lấy access token mới bằng refresh token.
 * Lưu token mới vào DB và trả về { accessToken, expiresAt }.
 */
export async function refreshZaloToken() {
    const appId = process.env.ZALO_APP_ID;
    const appSecret = process.env.ZALO_APP_SECRET;
    if (!appId || !appSecret) throw new Error('Thiếu ZALO_APP_ID hoặc ZALO_APP_SECRET');

    const setting = await prisma.setting.findUnique({ where: { key: 'ZALO_OA_REFRESH_TOKEN' } });
    const refreshToken = setting?.value || process.env.ZALO_OA_REFRESH_TOKEN;
    if (!refreshToken) throw new Error('Không có refresh token. Vui lòng kết nối lại qua OAuth.');

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
    if (!data.access_token) throw new Error(`Zalo trả về lỗi: ${JSON.stringify(data)}`);

    const expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : '';

    await saveZaloTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt,
    });

    console.log(`[Zalo] Token đã được làm mới tự động, hết hạn: ${expiresAt}`);
    return { accessToken: data.access_token, expiresAt };
}

// Refresh nền, không chặn luồng gửi tin hiện tại
function _triggerBackgroundRefresh() {
    if (_refreshing) return;
    _refreshing = true;
    refreshZaloToken()
        .catch(err => console.error('[Zalo] Tự động làm mới token thất bại:', err.message))
        .finally(() => { _refreshing = false; });
}

/**
 * Lấy access token: ưu tiên DB, fallback env.
 * Tự động kích hoạt refresh nền nếu token còn dưới AUTO_REFRESH_DAYS ngày.
 */
async function getAccessToken() {
    try {
        const [tokenSetting, expiresSetting] = await Promise.all([
            prisma.setting.findUnique({ where: { key: 'ZALO_OA_ACCESS_TOKEN' } }),
            prisma.setting.findUnique({ where: { key: 'ZALO_OA_EXPIRES_AT' } }),
        ]);
        if (tokenSetting?.value) {
            if (expiresSetting?.value) {
                const daysLeft = (new Date(expiresSetting.value) - Date.now()) / 86400000;
                if (daysLeft <= AUTO_REFRESH_DAYS) {
                    _triggerBackgroundRefresh();
                }
            }
            return tokenSetting.value;
        }
    } catch {}
    return process.env.ZALO_OA_ACCESS_TOKEN || null;
}

/**
 * Lưu tokens Zalo vào DB
 */
export async function saveZaloTokens({ accessToken, refreshToken, expiresAt }) {
    const ops = [];
    if (accessToken) {
        ops.push(prisma.setting.upsert({
            where: { key: 'ZALO_OA_ACCESS_TOKEN' },
            update: { value: accessToken },
            create: { key: 'ZALO_OA_ACCESS_TOKEN', value: accessToken },
        }));
    }
    if (refreshToken) {
        ops.push(prisma.setting.upsert({
            where: { key: 'ZALO_OA_REFRESH_TOKEN' },
            update: { value: refreshToken },
            create: { key: 'ZALO_OA_REFRESH_TOKEN', value: refreshToken },
        }));
    }
    if (expiresAt) {
        ops.push(prisma.setting.upsert({
            where: { key: 'ZALO_OA_EXPIRES_AT' },
            update: { value: expiresAt },
            create: { key: 'ZALO_OA_EXPIRES_AT', value: expiresAt },
        }));
    }
    await Promise.all(ops);
}

/**
 * Lấy trạng thái kết nối Zalo OA từ DB
 */
export async function getZaloStatus() {
    try {
        const [tokenSetting, expiresSetting] = await Promise.all([
            prisma.setting.findUnique({ where: { key: 'ZALO_OA_ACCESS_TOKEN' } }),
            prisma.setting.findUnique({ where: { key: 'ZALO_OA_EXPIRES_AT' } }),
        ]);
        return {
            connected: !!tokenSetting?.value,
            expiresAt: expiresSetting?.value || null,
            updatedAt: tokenSetting?.updatedAt || null,
        };
    } catch {
        return { connected: !!process.env.ZALO_OA_ACCESS_TOKEN, expiresAt: null, updatedAt: null };
    }
}

/**
 * Gửi tin nhắn văn bản đến một follower của OA
 */
export async function sendZaloMessage(zaloUserId, text) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        console.warn('[Zalo] ZALO_OA_ACCESS_TOKEN chưa được cấu hình');
        return { success: false, error: 'Chưa cấu hình Zalo OA token' };
    }
    if (!zaloUserId) {
        return { success: false, error: 'Thiếu Zalo User ID' };
    }

    try {
        const res = await fetch(ZALO_OA_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': accessToken,
            },
            body: JSON.stringify({
                recipient: { user_id: zaloUserId },
                message: { text },
            }),
        });

        const data = await res.json();
        if (data.error !== 0) {
            console.error('[Zalo] Lỗi gửi tin:', data);
            return { success: false, error: data.message };
        }
        return { success: true };
    } catch (err) {
        console.error('[Zalo] Exception:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Gửi tin nhắn đến nhiều người cùng lúc
 */
export async function sendZaloBatch(messages) {
    const results = await Promise.allSettled(
        messages.map(({ zaloUserId, text }) => sendZaloMessage(zaloUserId, text))
    );
    return results;
}
