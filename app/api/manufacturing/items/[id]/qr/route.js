import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';

// QR trỏ về trang tra cứu nội bộ /manufacturing/items/[id] — yêu cầu đăng nhập để xem (mục XII, không nhúng token trực tiếp)
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const item = await prisma.mfgItem.findUnique({ where: { id }, select: { code: true } });
    if (!item) return new Response('Not found', { status: 404 });

    const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const url = `${base}/manufacturing/items/${id}`;
    const svg = await QRCode.toString(url, { type: 'svg', width: 220, margin: 2 });
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' } });
});
