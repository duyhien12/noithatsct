import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { isR2Configured, uploadToR2 } from '@/lib/r2';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/svg+xml',
    'application/zip',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/octet-stream', // for .dwg, .dxf
];

const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf',
    '.doc', '.docx', '.xls', '.xlsx', '.svg',
    '.zip', '.rar', '.dwg', '.dxf',
];

const ALLOWED_UPLOAD_TYPES = ['products', 'library', 'proofs', 'documents'];

const MAX_FILE_SIZE_DEFAULT = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE_DOCUMENTS = 200 * 1024 * 1024; // 200MB

const THUMBNAIL_MIME = ['image/jpeg', 'image/png', 'image/webp'];

async function generateThumbnail(buffer, mimeType) {
    if (!THUMBNAIL_MIME.includes(mimeType)) return null;
    try {
        const thumbBuffer = await sharp(buffer)
            .resize({ width: 480, height: 270, fit: 'cover', position: 'center' })
            .jpeg({ quality: 70, progressive: true })
            .toBuffer();
        return thumbBuffer;
    } catch {
        return null;
    }
}

export const POST = withAuth(async (request) => {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'products';

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    // Validate upload type
    if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
        return NextResponse.json({ error: `Loại upload không hợp lệ. Cho phép: ${ALLOWED_UPLOAD_TYPES.join(', ')}` }, { status: 400 });
    }

    // Validate MIME type and extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json({ error: 'Loại file không được hỗ trợ' }, { status: 400 });
    }

    // Validate file size (documents allow 50MB, others 5MB)
    const maxSize = type === 'documents' ? MAX_FILE_SIZE_DOCUMENTS : MAX_FILE_SIZE_DEFAULT;
    const maxLabel = type === 'documents' ? '200MB' : '5MB';
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > maxSize) {
        return NextResponse.json({ error: `File quá lớn (tối đa ${maxLabel})` }, { status: 400 });
    }

    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const fileExt = ext || '.jpg';
    const base = path.basename(file.name, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${base}_${Date.now()}${fileExt}`;

    let url, thumbnailUrl = '';

    // Generate thumbnail for images
    const thumbBuffer = type === 'documents' ? await generateThumbnail(buffer, file.type) : null;
    const thumbFilename = thumbBuffer ? `thumb_${base}_${Date.now()}.jpg` : null;

    // Upload to R2 if configured, otherwise local filesystem
    if (isR2Configured) {
        const key = `${type}/${filename}`;
        url = await uploadToR2(buffer, key, file.type);
        if (thumbBuffer && thumbFilename) {
            const thumbKey = `${type}/thumbnails/${thumbFilename}`;
            thumbnailUrl = await uploadToR2(thumbBuffer, thumbKey, 'image/jpeg');
        }
    } else {
        // Fallback: local filesystem
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
        await mkdir(uploadDir, { recursive: true });
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        url = `/uploads/${type}/${filename}`;

        if (thumbBuffer && thumbFilename) {
            const thumbDir = path.join(process.cwd(), 'public', 'uploads', type, 'thumbnails');
            await mkdir(thumbDir, { recursive: true });
            await writeFile(path.join(thumbDir, thumbFilename), thumbBuffer);
            thumbnailUrl = `/uploads/${type}/thumbnails/${thumbFilename}`;
        }
    }

    return NextResponse.json({ url, thumbnailUrl });
});
