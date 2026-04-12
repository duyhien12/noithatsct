import { withAuth } from '@/lib/apiHandler';
import { getZaloStatus } from '@/lib/zalo';
import { notifyWorkOrderAssigned } from '@/lib/notify';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * POST /api/notifications/zalo-debug
 * Debug: kiểm tra toàn bộ flow thông báo Zalo
 * Body: { email } - email nhân viên cần test
 */
export const POST = withAuth(async (request) => {
    const { email } = await request.json();

    // 1. Kiểm tra token
    const tokenStatus = await getZaloStatus();

    // 2. Kiểm tra user có zaloUserId không
    const user = email ? await prisma.user.findUnique({
        where: { email },
        select: { name: true, email: true, zaloUserId: true, active: true },
    }) : null;

    // 3. Thử gửi tin test nếu có đủ thông tin
    let sendResult = null;
    const isExpired = tokenStatus.expiresAt ? new Date(tokenStatus.expiresAt) < new Date() : false;
    if (user?.zaloUserId && tokenStatus.connected && !isExpired) {
        sendResult = await notifyWorkOrderAssigned({
            code: 'WO-TEST',
            title: 'Đây là tin nhắn kiểm tra hệ thống thông báo',
            priority: 'Bình thường',
            dueDate: new Date().toISOString(),
            assignee: email,
            project: { name: 'Dự án test', code: 'TEST' },
        });
    }

    return NextResponse.json({
        token: {
            connected: tokenStatus.connected,
            expiresAt: tokenStatus.expiresAt,
            expired: tokenStatus.expiresAt ? new Date(tokenStatus.expiresAt) < new Date() : null,
        },
        user: user ? {
            name: user.name,
            email: user.email,
            hasZaloId: !!user.zaloUserId,
            zaloUserId: user.zaloUserId || null,
            active: user.active,
        } : null,
        sendResult,
        diagnosis: !tokenStatus.connected
            ? '❌ Token chưa được cấu hình — vào /hr/accounts kết nối Zalo OA'
            : isExpired
                ? '❌ Token đã hết hạn — vào /hr/accounts bấm Kết nối lại'
                : !user
                    ? '❌ Không tìm thấy user với email này'
                    : !user.zaloUserId
                        ? '❌ User chưa có Zalo User ID — cần điền vào profile tại /hr/accounts'
                        : sendResult?.success
                            ? '✅ Gửi thành công — kiểm tra Zalo của nhân viên'
                            : sendResult?.error
                                ? `❌ Gửi thất bại: ${sendResult.error}`
                                : '✅ Cấu hình đúng',
    });
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
