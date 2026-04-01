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
    if (!segments?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
}
