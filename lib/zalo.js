/**
 * Zalo Official Account (OA) notification utility
 * Docs: https://developers.zalo.me/docs/official-account/tin-nhan/gui-tin-nhan-van-ban
 */

const ZALO_OA_API = 'https://openapi.zalo.me/v2.0/oa/message';

/**
 * Gửi tin nhắn văn bản đến một follower của OA
 * @param {string} zaloUserId - Zalo User ID của nhân viên (follower)
 * @param {string} text - Nội dung tin nhắn
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendZaloMessage(zaloUserId, text) {
    const accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
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
 * @param {Array<{zaloUserId: string, text: string}>} messages
 */
export async function sendZaloBatch(messages) {
    const results = await Promise.allSettled(
        messages.map(({ zaloUserId, text }) => sendZaloMessage(zaloUserId, text))
    );
    return results;
}
