import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Verify Bearer token from mobile app
 */
async function verifyMobileToken(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    try {
        const jwt = (await import('jsonwebtoken')).default;
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        return {
            user: {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
            },
        };
    } catch {
        return null;
    }
}

/**
 * Wraps an API route handler with auth check, role authorization, error handling, and rate limiting.
 * @param {Function} handler - async (request, context, session) => NextResponse
 * @param {Object} options
 * @param {boolean} options.public - skip auth check
 * @param {string[]} options.roles - allowed roles (e.g., ['giam_doc', 'pho_gd']). If not set, all authenticated users are allowed.
 */
export function withAuth(handler, options = {}) {
    return async (request, context) => {
        try {
            // Auth check — try NextAuth session first, then Bearer token (mobile)
            let session = null;
            if (!options.public) {
                session = await getServerSession(authOptions);
                if (!session) {
                    session = await verifyMobileToken(request);
                }
                if (!session) {
                    return NextResponse.json(
                        { error: 'Unauthorized' },
                        { status: 401 }
                    );
                }

                // Role authorization
                if (options.roles && !options.roles.includes(session.user.role)) {
                    return NextResponse.json(
                        { error: 'Bạn không có quyền thực hiện thao tác này' },
                        { status: 403 }
                    );
                }

                // Viewer role: chỉ được đọc (GET), chặn tất cả thao tác ghi
                if (session.user.role === 'viewer' && !options.allowViewer) {
                    const method = request.method?.toUpperCase();
                    if (method !== 'GET') {
                        return NextResponse.json(
                            { error: 'Tài khoản chỉ xem — không có quyền chỉnh sửa' },
                            { status: 403 }
                        );
                    }
                }

                // Rate limiting per user
                const rl = rateLimit(session.user.id);
                if (!rl.success) {
                    return NextResponse.json(
                        { error: 'Too many requests' },
                        { status: 429 }
                    );
                }
            }

            return await handler(request, context, session);
        } catch (error) {
            console.error(`API Error [${request.method} ${request.url}]:`, error);

            // Prisma known error
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: 'Bản ghi đã tồn tại (trùng mã)' },
                    { status: 409 }
                );
            }
            if (error.code === 'P2025') {
                return NextResponse.json(
                    { error: 'Không tìm thấy bản ghi' },
                    { status: 404 }
                );
            }

            // Zod validation error
            if (error.name === 'ZodError') {
                return NextResponse.json(
                    { error: 'Dữ liệu không hợp lệ', details: error.errors },
                    { status: 400 }
                );
            }

            // Generic error - do NOT leak internal details
            return NextResponse.json(
                { error: 'Lỗi hệ thống' },
                { status: 500 }
            );
        }
    };
}
