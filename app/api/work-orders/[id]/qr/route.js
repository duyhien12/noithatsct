import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.workOrder.findUnique({ where: { id }, select: { code: true } });
    if (!order) return new Response('Not found', { status: 404 });

    const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const url = `${base}/work-orders?wo=${id}`;
    const svg = await QRCode.toString(url, { type: 'svg', width: 200, margin: 2 });
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' } });
});
