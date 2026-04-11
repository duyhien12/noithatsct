/**
 * Zalo Official Account (OA) notification utility
 * Docs: https://developers.zalo.me/docs/official-account/tin-nhan/gui-tin-nhan-van-ban
 */

import prisma from './prisma';

const ZALO_OA_API = 'https://openapi.zalo.me/v2.0/oa/message';

/**
 * Lấy access token: ưu tiên DB, fallback env
 */
async function getAccessToken() {
    try {
        const setting = await prisma.setting.findUnique({ where: { key: 'ZALO_OA_ACCESS_TOKEN' } });
        if (setting?.value) return setting.value;
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
