/**
 * Nhận diện @tên trong nội dung ghi chú/bình luận, dùng chung cho client & API routes.
 * Không dùng cú pháp đặc biệt (@[Name]) — so khớp trực tiếp "@" + tên đầy đủ có trong danh sách
 * người dùng công ty, ưu tiên tên dài nhất khớp trước để tránh nhầm "@An" trong "@Anh".
 */

function isWordChar(ch) {
    return !!ch && /[\p{L}\p{N}_]/u.test(ch);
}

function sortedNames(candidateNames) {
    return [...new Set((candidateNames || []).filter(Boolean))].sort((a, b) => b.length - a.length);
}

/** Trả về danh sách tên (không trùng) được @nhắc đến trong text */
export function findMentionedNames(text, candidateNames) {
    if (!text || !candidateNames?.length) return [];
    const names = sortedNames(candidateNames);
    const found = new Set();
    for (let i = 0; i < text.length; i++) {
        if (text[i] !== '@' || isWordChar(text[i - 1])) continue;
        for (const name of names) {
            if (text.startsWith(name, i + 1) && !isWordChar(text[i + 1 + name.length])) {
                found.add(name);
                break;
            }
        }
    }
    return [...found];
}

/** Tách text thành các đoạn { type: 'text' | 'mention', value } để render highlight */
export function splitMentionSegments(text, candidateNames) {
    if (!text) return [];
    const names = sortedNames(candidateNames);
    const segments = [];
    let buffer = '';
    let i = 0;
    while (i < text.length) {
        if (text[i] === '@' && !isWordChar(text[i - 1])) {
            let matched = null;
            for (const name of names) {
                if (text.startsWith(name, i + 1) && !isWordChar(text[i + 1 + name.length])) { matched = name; break; }
            }
            if (matched) {
                if (buffer) { segments.push({ type: 'text', value: buffer }); buffer = ''; }
                segments.push({ type: 'mention', value: matched });
                i += 1 + matched.length;
                continue;
            }
        }
        buffer += text[i];
        i++;
    }
    if (buffer) segments.push({ type: 'text', value: buffer });
    return segments;
}

export function normalizeForSearch(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
