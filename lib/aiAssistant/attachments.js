/**
 * Xử lý file đính kèm cho "Trợ lý Hồ sơ AI" — cho phép người dùng tải lên báo giá/hợp đồng/
 * ảnh hiện trường... để Claude đọc và soạn hồ sơ dựa theo, thay vì phải gõ lại thủ công.
 */

export const MAX_ATTACHMENTS = 5;
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB/file
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20MB tổng

const PDF_TYPE = 'application/pdf';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SPREADSHEET_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
];
const TEXT_TYPES = ['text/plain', 'text/csv'];

export const SUPPORTED_ATTACHMENT_TYPES = [PDF_TYPE, ...IMAGE_TYPES, ...SPREADSHEET_TYPES, ...TEXT_TYPES];

function base64ByteLength(base64) {
    const clean = base64.replace(/=+$/, '');
    return Math.floor((clean.length * 3) / 4);
}

function spreadsheetToText(buffer, fileName) {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const parts = workbook.SheetNames.map((sheetName) => {
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        return `## Sheet: ${sheetName}\n${csv}`;
    });
    return `# Tệp Excel: ${fileName}\n\n${parts.join('\n\n')}`;
}

/**
 * Chuyển danh sách attachment (từ client, base64) thành content blocks cho Claude Messages API.
 * Ném lỗi (với message tiếng Việt) nếu vượt giới hạn hoặc định dạng không hỗ trợ.
 */
export function buildAttachmentBlocks(attachments) {
    if (!Array.isArray(attachments) || attachments.length === 0) return [];

    if (attachments.length > MAX_ATTACHMENTS) {
        throw new Error(`Chỉ được đính kèm tối đa ${MAX_ATTACHMENTS} tệp mỗi lần.`);
    }

    let totalBytes = 0;
    const blocks = [];

    for (const att of attachments) {
        const { name = 'tệp đính kèm', mimeType = '', dataBase64 = '' } = att || {};
        if (!dataBase64) continue;

        const sizeBytes = base64ByteLength(dataBase64);
        totalBytes += sizeBytes;
        if (sizeBytes > MAX_FILE_BYTES) {
            throw new Error(`Tệp "${name}" vượt quá giới hạn ${MAX_FILE_BYTES / 1024 / 1024}MB.`);
        }
        if (totalBytes > MAX_TOTAL_BYTES) {
            throw new Error(`Tổng dung lượng file đính kèm vượt quá ${MAX_TOTAL_BYTES / 1024 / 1024}MB.`);
        }

        if (mimeType === PDF_TYPE) {
            blocks.push({
                type: 'document',
                title: name,
                source: { type: 'base64', media_type: PDF_TYPE, data: dataBase64 },
            });
        } else if (IMAGE_TYPES.includes(mimeType)) {
            blocks.push({
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: dataBase64 },
            });
        } else if (SPREADSHEET_TYPES.includes(mimeType)) {
            const buffer = Buffer.from(dataBase64, 'base64');
            const text = spreadsheetToText(buffer, name);
            blocks.push({
                type: 'document',
                title: name,
                source: { type: 'text', media_type: 'text/plain', data: text },
            });
        } else if (TEXT_TYPES.includes(mimeType)) {
            const text = Buffer.from(dataBase64, 'base64').toString('utf-8');
            blocks.push({
                type: 'document',
                title: name,
                source: { type: 'text', media_type: 'text/plain', data: text },
            });
        } else {
            throw new Error(`Định dạng tệp "${name}" chưa được hỗ trợ. Hỗ trợ: PDF, ảnh (JPG/PNG/WEBP), Excel (.xlsx/.xls), văn bản (.txt/.csv). Với file Word, vui lòng xuất/chụp thành PDF hoặc ảnh trước khi tải lên.`);
        }
    }

    return blocks;
}
