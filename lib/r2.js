import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
} = process.env;

export const isR2Configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);

let s3Client = null;

function getClient() {
    if (!s3Client && isR2Configured) {
        s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });
    }
    return s3Client;
}

/**
 * Upload a file buffer to Cloudflare R2.
 * @param {Buffer} buffer - File contents
 * @param {string} key - Object key (path in bucket), e.g. "products/photo_123.jpg"
 * @param {string} contentType - MIME type
 * @returns {string} Public URL of the uploaded file
 */
export async function uploadToR2(buffer, key, contentType) {
    const client = getClient();
    if (!client) throw new Error('R2 not configured');

    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));

    const publicBase = R2_PUBLIC_URL || `https://${R2_BUCKET_NAME}.r2.dev`;
    return `${publicBase.replace(/\/$/, '')}/${key}`;
}
