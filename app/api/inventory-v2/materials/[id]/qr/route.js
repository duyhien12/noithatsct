import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';
import { materialQrUrl } from '@/lib/inventoryV2/qrPayload';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const material = await prisma.invMaterial.findUnique({ where: { id }, select: { id: true, sku: true } });
    if (!material) return new Response('Not found', { status: 404 });

    const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const url = materialQrUrl(base, material.id);
    const svg = await QRCode.toString(url, { type: 'svg', width: 220, margin: 2 });

    return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' },
    });
});
