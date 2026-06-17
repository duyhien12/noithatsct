import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions = {
    providers: [
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
                const allowedRoles = (() => { try { return JSON.parse(user.allowedRoles || '[]'); } catch { return []; } })();
                return { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department || '', allowedRoles };
            },
        }),
    ],

    callbacks: {
        /**
         * Gắn role và id vào JWT token.
         */
        async jwt({ token, user, account, trigger, session: sessionData }) {
            if (account && user) {
                token.role = user.role;
                token.id = user.id;
                token.department = user.department || '';
                token.allowedRoles = user.allowedRoles || [];
            }
            // Xử lý đổi phòng ban
            if (trigger === 'update' && sessionData?.switchToRole) {
                const allowed = token.allowedRoles || [];
                if (allowed.includes(sessionData.switchToRole)) {
                    token.role = sessionData.switchToRole;
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id;
                session.user.department = token.department || '';
                session.user.allowedRoles = token.allowedRoles || [];
            }
            return session;
        },
    },

    pages: { signIn: '/login' },
    session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 giờ
    secret: process.env.NEXTAUTH_SECRET,
};
