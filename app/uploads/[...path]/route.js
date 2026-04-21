import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const MIME = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
};

export async function GET(request, { params }) {
    const { path: segments } = await params;
    if (!segments?.length) return new NextResponse('Not found', { status: 404 });

    // Prevent path traversal
    const safe = segments.map(s => s.replace(/\.\./g, '')).join('/');
    const filePath = path.join(process.cwd(), 'public', 'uploads', safe);

    try {
        const buffer = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME[ext] || 'application/octet-stream';
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch {
        return new NextResponse(
            `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc"><div style="text-align:center;color:#94a3b8"><div style="font-size:48px;margin-bottom:12px">⚠️</div><div style="font-size:16px;font-weight:600;color:#475569;margin-bottom:6px">Không tìm thấy file</div><div style="font-size:13px">File đã bị xóa hoặc chưa được tải lên server</div></div></body></html>`,
            { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }
}
