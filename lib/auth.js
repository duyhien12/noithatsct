import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { compareSync, hashSync } from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';

const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const authOptions = {
    providers: [
        // ── Google OAuth ──────────────────────────────────────────────
        ...(GOOGLE_ID && GOOGLE_SECRET
            ? [GoogleProvider({ clientId: GOOGLE_ID, clientSecret: GOOGLE_SECRET })]
            : []),

        // ── Email + Mật khẩu ─────────────────────────────────────────
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const user = await prisma.user.findUnique({ where: { email: credentials.email } });
                if (!user || !user.active) return null;
                if (!compareSync(credentials.password, user.password)) return null;
                return { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department || '' };
            },
        }),
    ],

    callbacks: {
        /**
         * Chạy sau khi Google xác thực thành công.
         * Tự tạo user mới nếu email chưa tồn tại trong DB.
         */
        async signIn({ user, account }) {
            if (account?.provider !== 'google') return true;
            if (!user?.email) return false;

            try {
                const existing = await prisma.user.findUnique({ where: { email: user.email } });

                if (!existing) {
                    // Tạo user mới — role mặc định ky_thuat, đợi admin phân quyền
                    await prisma.user.create({
                        data: {
                            email: user.email,
                            name: user.name || user.email.split('@')[0],
                            // Random password không thể đoán — user Google không dùng credentials
                            password: hashSync(randomUUID(), 8),
                            role: 'ky_thuat',
                            department: '',
                            active: true,
                        },
                    });
                } else if (!existing.active) {
                    // Tài khoản bị khoá → redirect về login với lỗi
                    return '/login?error=AccountDisabled';
                }

                return true;
            } catch (err) {
                console.error('[Google signIn] Lỗi DB:', err);
                return '/login?error=DatabaseError';
            }
        },

        /**
         * Gắn role và id vào JWT token.
         * Chỉ chạy ở lần sign-in đầu tiên (account && user có giá trị).
         */
        async jwt({ token, user, account }) {
            if (account && user) {
                if (account.provider === 'google') {
                    try {
                        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
                        token.role = dbUser?.role || 'ky_thuat';
                        token.id = dbUser?.id || '';
                        token.department = dbUser?.department || '';
                    } catch (err) {
                        console.error('[Google jwt] Lỗi DB:', err);
                        token.role = 'ky_thuat';
                        token.id = '';
                    }
                } else {
                    token.role = user.role;
                    token.id = user.id;
                    token.department = user.department || '';
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id;
                session.user.department = token.department || '';
            }
            return session;
        },
    },

    pages: { signIn: '/login' },
    session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 giờ
    secret: process.env.NEXTAUTH_SECRET,
};
