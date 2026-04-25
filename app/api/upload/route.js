import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { isR2Configured, uploadToR2 } from '@/lib/r2';

const ALLOWED_UPLOAD_TYPES = ['products', 'library', 'proofs', 'documents'];
const THUMBNAIL_MIME = ['image/jpeg', 'image/png', 'image/webp'];

async function generateThumbnail(buffer, mimeType) {
    if (!THUMBNAIL_MIME.includes(mimeType)) return null;
    try {
        const sharp = (await import('sharp')).default;
        return await sharp(buffer)
            .resize({ width: 480, height: 270, fit: 'cover', position: 'center' })
            .jpeg({ quality: 70, progressive: true })
            .toBuffer();
    } catch {
        return null;
    }
}

// Stream Web ReadableStream → busboy via PassThrough (no size limit)
function parseMultipart(webStream, contentType) {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Busboy = require('busboy');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PassThrough } = require('stream');

        const bb = Busboy({ headers: { 'content-type': contentType }, limits: {} });
        const pt = new PassThrough();
        pt.pipe(bb);

        const fields = {};
        let fileName = '', fileMime = 'application/octet-stream';
        const fileChunks = [];

        bb.on('field', (name, val) => { fields[name] = val; });
        bb.on('file', (_name, stream, info) => {
            fileName = info.filename || '';
            fileMime = info.mimeType || 'application/octet-stream';
            stream.on('data', (chunk) => fileChunks.push(chunk));
            stream.on('error', reject);
        });
        bb.on('finish', () => {
            resolve({
                fields,
                fileBuffer: fileChunks.length > 0 ? Buffer.concat(fileChunks) : null,
                fileName,
                fileMime,
            });
        });
        bb.on('error', reject);
        pt.on('error', reject);

        // Pump Web ReadableStream → PassThrough chunk by chunk
        const reader = webStream.getReader();
        const pump = async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) { pt.end(); break; }
                    if (!pt.write(value)) {
                        // wait for drain if backpressure
                        await new Promise(r => pt.once('drain', r));
                    }
                }
            } catch (err) {
                pt.destroy(err);
                reject(err);
            }
        };
        pump();
    });
}

export const POST = withAuth(async (request) => {
    const contentType = request.headers.get('content-type') || '';

    if (!request.body) {
        return NextResponse.json({ error: 'Request body is empty.' }, { status: 400 });
    }

    let parsed;
    try {
        parsed = await parseMultipart(request.body, contentType);
    } catch (err) {
        console.error('[upload] parse error:', err?.message, err?.stack);
        return NextResponse.json({ error: `Lỗi đọc file: ${err?.message || 'unknown'}` }, { status: 400 });
    }

    const { fields, fileBuffer, fileName, fileMime } = parsed;
    const type = fields.type || 'products';

    if (!fileBuffer || fileBuffer.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy file trong request.' }, { status: 400 });
    }
    if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
        return NextResponse.json({ error: `Loại upload không hợp lệ: ${type}` }, { status: 400 });
    }

    const ext = path.extname(fileName).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext || '.bin'}`;

    let url = '', thumbnailUrl = '';
    const thumbBuffer = type === 'documents' ? await generateThumbnail(fileBuffer, fileMime) : null;
    const thumbFilename = thumbBuffer ? `${crypto.randomUUID()}.jpg` : null;

    const forwardUrl = process.env.UPLOAD_FORWARD_URL;
    const forwardKey = process.env.UPLOAD_SERVICE_KEY;

    if (isR2Configured) {
        // R2 cloud storage
        url = await uploadToR2(fileBuffer, `${type}/${filename}`, fileMime);
        if (thumbBuffer && thumbFilename) {
            thumbnailUrl = await uploadToR2(thumbBuffer, `${type}/thumbnails/${thumbFilename}`, 'image/jpeg');
        }
    } else if (forwardUrl && forwardKey) {
        // Forward lên production server, fallback về local nếu không kết nối được
        let forwarded = false;
        try {
            const fd = new FormData();
            fd.append('file', new Blob([fileBuffer], { type: fileMime }), filename);
            fd.append('type', type);
            fd.append('filename', filename);
            if (thumbBuffer && thumbFilename) {
                fd.append('thumbnail', new Blob([thumbBuffer], { type: 'image/jpeg' }), thumbFilename);
                fd.append('thumbnailFilename', thumbFilename);
            }
            const res = await fetch(`${forwardUrl}/api/upload-direct`, {
                method: 'POST',
                headers: { 'x-upload-service-key': forwardKey },
                body: fd,
                signal: AbortSignal.timeout(15000),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Forward upload failed: ${res.status}`);
            }
            const result = await res.json();
            url = result.url || '';
            thumbnailUrl = result.thumbnailUrl || '';
            forwarded = true;
        } catch (err) {
            console.warn('[upload] Forward thất bại, dùng local storage:', err.message);
        }
        if (!forwarded) {
            // Fallback: lưu local, URL dùng localhost
            const localBase = process.env.NEXT_PUBLIC_LOCAL_BASE_URL || 'http://localhost:3000';
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
            await mkdir(uploadDir, { recursive: true });
            await writeFile(path.join(uploadDir, filename), fileBuffer);
            url = `${localBase}/uploads/${type}/${filename}`;
        }
    } else {
        // Local storage (fallback)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), fileBuffer);
        url = `${baseUrl}/uploads/${type}/${filename}`;

        if (thumbBuffer && thumbFilename) {
            const thumbDir = path.join(process.cwd(), 'public', 'uploads', type, 'thumbnails');
            await mkdir(thumbDir, { recursive: true });
            await writeFile(path.join(thumbDir, thumbFilename), thumbBuffer);
            thumbnailUrl = `${baseUrl}/uploads/${type}/thumbnails/${thumbFilename}`;
        }
    }

    return NextResponse.json({ url, thumbnailUrl });
});
