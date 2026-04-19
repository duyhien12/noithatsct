/**
 * Script migrate local uploads lên production server
 * Chạy: node migrate-uploads.mjs
 */
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROD_URL = 'https://admin.kientrucsct.com';
const SERVICE_KEY = 'sct-upload-2026-secret';
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

const TYPES = ['products', 'library', 'proofs', 'documents'];

async function uploadFile(type, filename, fileBuffer, mimeType) {
    const fd = new FormData();
    fd.append('file', new Blob([fileBuffer], { type: mimeType }), filename);
    fd.append('type', type);
    fd.append('filename', filename);

    const res = await fetch(`${PROD_URL}/api/upload-direct`, {
        method: 'POST',
        headers: { 'x-upload-service-key': SERVICE_KEY },
        body: fd,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

async function uploadThumbnail(type, thumbFilename, thumbBuffer) {
    // Upload thumbnail bằng cách gửi file dummy + thumbnail thật
    const dummyBlob = new Blob([Buffer.from('x')], { type: 'text/plain' });
    const dummyFilename = `_dummy_${Date.now()}.txt`;

    const fd = new FormData();
    fd.append('file', dummyBlob, dummyFilename);
    fd.append('type', type);
    fd.append('filename', dummyFilename);
    fd.append('thumbnail', new Blob([thumbBuffer], { type: 'image/jpeg' }), thumbFilename);
    fd.append('thumbnailFilename', thumbFilename);

    const res = await fetch(`${PROD_URL}/api/upload-direct`, {
        method: 'POST',
        headers: { 'x-upload-service-key': SERVICE_KEY },
        body: fd,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.skp': 'application/octet-stream',
        '.txt': 'text/plain',
    };
    return map[ext] || 'application/octet-stream';
}

async function migrateType(type) {
    const typeDir = path.join(UPLOADS_DIR, type);
    let files;
    try {
        files = await readdir(typeDir);
    } catch {
        console.log(`  [skip] ${type}/ — không tồn tại`);
        return;
    }

    const mainFiles = files.filter(f => !f.startsWith('.') && f !== 'thumbnails');
    const thumbDir = path.join(typeDir, 'thumbnails');
    let thumbFiles = [];
    try {
        thumbFiles = await readdir(thumbDir);
        thumbFiles = thumbFiles.filter(f => !f.startsWith('.'));
    } catch {
        // no thumbnails dir
    }

    console.log(`\n[${type}] ${mainFiles.length} file, ${thumbFiles.length} thumbnail`);

    for (const filename of mainFiles) {
        try {
            const buf = await readFile(path.join(typeDir, filename));
            await uploadFile(type, filename, buf, getMimeType(filename));
            console.log(`  ✓ ${filename}`);
        } catch (err) {
            console.error(`  ✗ ${filename}: ${err.message}`);
        }
    }

    for (const thumbFilename of thumbFiles) {
        try {
            const buf = await readFile(path.join(thumbDir, thumbFilename));
            await uploadThumbnail(type, thumbFilename, buf);
            console.log(`  ✓ thumbnails/${thumbFilename}`);
        } catch (err) {
            console.error(`  ✗ thumbnails/${thumbFilename}: ${err.message}`);
        }
    }
}

async function main() {
    console.log('=== Migrate uploads → production ===');
    console.log(`Target: ${PROD_URL}`);

    // Kiểm tra kết nối
    try {
        const test = await fetch(`${PROD_URL}/api/upload-direct`, {
            method: 'POST',
            headers: { 'x-upload-service-key': 'wrong-key' },
        });
        if (test.status === 401) {
            console.log('✓ Kết nối tới production OK\n');
        }
    } catch (err) {
        console.error('✗ Không kết nối được production:', err.message);
        process.exit(1);
    }

    for (const type of TYPES) {
        await migrateType(type);
    }

    console.log('\n=== Xong ===');
}

main().catch(console.error);
