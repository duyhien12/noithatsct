/**
 * Chuyển file upload local lên Cloudflare R2, giữ nguyên key `type/filename`
 * để route /uploads/[...path] chuyển hướng đúng sang R2.
 *
 * Chạy: UPLOADS_DIR=/đường/dẫn/uploads node scripts/migrate-uploads-to-r2.mjs [--delete]
 *   --delete: xoá file local sau khi đã upload và kiểm tra kích thước trên R2 khớp
 * Cần biến môi trường R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.
 */
import { readFile, readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
const DELETE_LOCAL = process.argv.includes('--delete');

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('Thiếu biến môi trường R2_*');
    process.exit(1);
}

const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const MIME = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
};

async function* walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else if (entry.isFile() && !entry.name.startsWith('.')) yield full;
    }
}

async function remoteSize(key) {
    try {
        const head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
        return head.ContentLength;
    } catch {
        return null;
    }
}

async function main() {
    console.log(`=== Chuyển ${UPLOADS_DIR} → R2 bucket ${R2_BUCKET_NAME}${DELETE_LOCAL ? ' (xoá local sau khi xong)' : ''} ===`);
    let uploaded = 0, skipped = 0, deleted = 0, failed = 0;

    for await (const file of walk(UPLOADS_DIR)) {
        const key = path.relative(UPLOADS_DIR, file).split(path.sep).join('/');
        try {
            const { size } = await stat(file);
            if (await remoteSize(key) === size) {
                skipped++;
            } else {
                await client.send(new PutObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: key,
                    Body: await readFile(file),
                    ContentType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
                }));
                if (await remoteSize(key) !== size) throw new Error('kích thước trên R2 không khớp');
                uploaded++;
                console.log(`  ✓ ${key}`);
            }
            if (DELETE_LOCAL) {
                await unlink(file);
                deleted++;
            }
        } catch (err) {
            failed++;
            console.error(`  ✗ ${key}: ${err.message}`);
        }
    }

    console.log(`\nĐã upload: ${uploaded}, đã có sẵn: ${skipped}, đã xoá local: ${deleted}, lỗi: ${failed}`);
    if (failed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
