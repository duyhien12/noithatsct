/**
 * Sinh phần viết tắt cho mã sản phẩm sản xuất, ví dụ:
 * "Phòng khách" -> "PK", "Tủ bếp trên" -> "TBT"
 */
export function abbreviate(text, maxLen = 4) {
    if (!text) return 'SP';
    const normalized = text
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // bỏ dấu
        .replace(/đ/gi, 'd')
        .trim();
    const words = normalized.split(/\s+/).filter(Boolean);
    const abbr = words.map(w => w[0]).join('').toUpperCase();
    return (abbr || 'SP').slice(0, maxLen);
}

export function buildItemCodePrefix(projectCode, category, name) {
    const cat = abbreviate(category || 'SP', 3);
    const nameAbbr = abbreviate(name || 'SP', 3);
    return `${projectCode}-${cat}-${nameAbbr}-`;
}
