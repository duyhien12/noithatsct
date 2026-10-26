// Quy tắc tệp đính kèm Đồng hành 360 — hàm thuần, dùng chung cho giao diện và API.
import {
    PHOTO_CATEGORIES, IMAGE_EXTENSIONS, DOCUMENT_EXTENSIONS, ATTACHMENT_MAX_MB, ATTACHMENT_CATEGORY_LABELS,
} from './constants';

/** Phần mở rộng (chữ thường, không dấu chấm) của tên tệp hoặc URL. */
export function fileExtension(name) {
    const clean = String(name || '').split(/[?#]/)[0];
    const dot = clean.lastIndexOf('.');
    return dot > -1 ? clean.slice(dot + 1).toLowerCase() : '';
}

export function isPhotoCategory(category) {
    return PHOTO_CATEGORIES.includes(category);
}

/** Tệp có phải ảnh không (theo MIME hoặc phần mở rộng). */
export function isImageFile({ mimeType, type, name, fileName, url } = {}) {
    const mime = mimeType || type || '';
    if (mime) return mime.startsWith('image/');
    return IMAGE_EXTENSIONS.includes(fileExtension(name || fileName || url));
}

/**
 * Kiểm tra tệp trước khi upload.
 * @param {{ name: string, size?: number, type?: string }} file
 * @param {string} category BEFORE | DURING | AFTER | DOCUMENT
 * @returns {string|null} thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ
 */
export function validateIssueFile(file, category) {
    const photo = isPhotoCategory(category);
    const ext = fileExtension(file?.name);
    const allowed = photo ? IMAGE_EXTENSIONS : DOCUMENT_EXTENSIONS;
    const mimeOk = photo ? (!file?.type || file.type.startsWith('image/')) : true;
    if (!allowed.includes(ext) || !mimeOk) {
        return photo
            ? `"${file?.name}" không phải ảnh. Mục ${ATTACHMENT_CATEGORY_LABELS[category]} chỉ nhận ${IMAGE_EXTENSIONS.join(', ').toUpperCase()}.`
            : `"${file?.name}" có định dạng không được hỗ trợ. Chỉ nhận: ${DOCUMENT_EXTENSIONS.join(', ').toUpperCase()}.`;
    }
    const maxMb = photo ? ATTACHMENT_MAX_MB.photo : ATTACHMENT_MAX_MB.document;
    if ((file?.size || 0) > maxMb * 1024 * 1024) {
        return `"${file?.name}" vượt quá ${maxMb} MB.`;
    }
    if (!file?.size) return `"${file?.name}" là tệp rỗng.`;
    return null;
}

/**
 * Phía API: tệp đăng ký vào mục ảnh phải là ảnh. Trả lỗi hoặc null.
 * @param {{ category: string, mimeType?: string, fileName?: string, url?: string }} input
 */
export function validateAttachmentInput({ category, mimeType, fileName, url }) {
    if (!isPhotoCategory(category)) {
        const ext = fileExtension(fileName || url);
        return !ext || DOCUMENT_EXTENSIONS.includes(ext) ? null : 'Định dạng tệp không được hỗ trợ';
    }
    return isImageFile({ mimeType, fileName, url }) ? null : `Mục ${ATTACHMENT_CATEGORY_LABELS[category]} chỉ nhận tệp ảnh`;
}
