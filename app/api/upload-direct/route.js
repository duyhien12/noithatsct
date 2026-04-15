/**
 * /api/upload-direct
 * Internal endpoint — chỉ nhận request từ localhost dev với service key.
 * Lưu file vào filesystem của production server và trả về URL đầy đủ.
 */
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_TYPES = ['products', 'library', 'proofs', 'documents'];

export async function POST(request) {
    // Kiểm tra service key
    const key = request.headers.get('x-upload-service-key');
    const serviceKey = process.env.UPLOAD_SERVICE_KEY;

    if (!serviceKey || key !== serviceKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
        return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const type = formData.get('type') || 'documents';
        const filename = formData.get('filename');

        if (!file || !filename) {
            return NextResponse.json({ error: 'Thiếu file hoặc filename' }, { status: 400 });
        }
        if (!ALLOWED_TYPES.includes(type)) {
            return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        const url = `${baseUrl}/uploads/${type}/${filename}`;

        // Thumbnail nếu có
        let thumbnailUrl = '';
        const thumbFile = formData.get('thumbnail');
        const thumbFilename = formData.get('thumbnailFilename');
        if (thumbFile && thumbFilename) {
            const thumbDir = path.join(process.cwd(), 'public', 'uploads', type, 'thumbnails');
            await mkdir(thumbDir, { recursive: true });
            const thumbBuf = Buffer.from(await thumbFile.arrayBuffer());
            await writeFile(path.join(thumbDir, thumbFilename), thumbBuf);
            thumbnailUrl = `${baseUrl}/uploads/${type}/thumbnails/${thumbFilename}`;
        }

        return NextResponse.json({ url, thumbnailUrl });
    } catch (err) {
        console.error('[upload-direct]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
