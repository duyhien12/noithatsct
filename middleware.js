import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Public paths - no auth required
    const publicPaths = ['/login', '/api/auth', '/progress', '/public', '/api/public'];
    const isPublic = publicPaths.some(p => pathname.startsWith(p));
    if (isPublic) return NextResponse.next();

    // Public PDF pages: /quotations/[id]/pdf
    if (/^\/quotations\/[^/]+\/pdf/.test(pathname)) return NextResponse.next();

    // Static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/uploads')
    ) {
        return NextResponse.next();
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        // API routes return 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Pages redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
