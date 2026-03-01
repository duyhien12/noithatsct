import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { isR2Configured, uploadToR2 } from '@/lib/r2';

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
];

const ALLOWED_UPLOAD_TYPES = ['products', 'library', 'proofs', 'documents'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const POST = withAuth(async (request) => {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'products';

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    // Validate upload type
    if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
        return NextResponse.json({ error: `Loại upload không hợp lệ. Cho phép: ${ALLOWED_UPLOAD_TYPES.join(', ')}` }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Loại file không được hỗ trợ. Chỉ chấp nhận: JPEG, PNG, WebP, GIF, PDF' }, { status: 400 });
    }

    // Validate file size
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File quá lớn (tối đa 5MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const ext = path.extname(file.name) || '.jpg';
    const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${base}_${Date.now()}${ext}`;

    // Upload to R2 if configured, otherwise local filesystem
    if (isR2Configured) {
        const key = `${type}/${filename}`;
        const url = await uploadToR2(buffer, key, file.type);
        return NextResponse.json({ url });
    }

    // Fallback: local filesystem
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
    await mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/${type}/${filename}`;
    return NextResponse.json({ url });
});
