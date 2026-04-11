import { withAuth } from '@/lib/apiHandler';
import { getZaloStatus } from '@/lib/zalo';
import { NextResponse } from 'next/server';

/**
 * GET /api/notifications/zalo-status
 * Lấy trạng thái kết nối Zalo OA (chỉ admin)
 */
export const GET = withAuth(async () => {
    const status = await getZaloStatus();
    return NextResponse.json(status);
}, { roles: ['ban_gd', 'giam_doc', 'pho_gd'] });
