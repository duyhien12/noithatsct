/**
 * Định dạng dữ liệu dùng chung toàn hệ thống.
 *
 * Quy chuẩn:
 *   Tiền:       1.250.000.000 ₫   (làm tròn đến đồng, không có phần thập phân thừa)
 *   Rút gọn:    1,25 tỷ
 *   Ngày:       15/09/2026
 *   Phần trăm:  75%
 *   Điện thoại: 0901 234 567
 */

const nf = new Intl.NumberFormat('vi-VN');

function toNumber(value) {
    if (value == null || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* Tiền tệ                                                             */
/* ------------------------------------------------------------------ */

/**
 * Tiền Việt Nam, luôn làm tròn đến đồng.
 * formatCurrency(35966666.667) -> "35.966.667 ₫"
 */
export function formatCurrency(value, { fallback = '0 ₫', symbol = true } = {}) {
    const n = toNumber(value);
    if (n === null) return fallback;
    const text = nf.format(Math.round(n));
    return symbol ? `${text} ₫` : text;
}

/** Alias ngắn, giữ tương thích với code cũ. */
export const fmt = (value) => formatCurrency(value);

/**
 * Số tiền rút gọn cho KPI / biểu đồ.
 * formatCompact(1250000000) -> "1,25 tỷ"
 */
export function formatCompact(value, { fallback = '—', suffix = '' } = {}) {
    const n = toNumber(value);
    if (n === null) return fallback;

    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';

    const build = (num, unit) => {
        const rounded = Math.round(num * 100) / 100;
        const text = nf.format(rounded);
        return `${sign}${text} ${unit}${suffix}`;
    };

    if (abs >= 1e12) return build(abs / 1e12, 'nghìn tỷ');
    if (abs >= 1e9)  return build(abs / 1e9,  'tỷ');
    if (abs >= 1e6)  return build(abs / 1e6,  'triệu');
    if (abs >= 1e3)  return build(abs / 1e3,  'nghìn');
    return `${sign}${nf.format(Math.round(abs))}${suffix}`;
}

/** Tiền rút gọn có ký hiệu ₫: "1,25 tỷ ₫" -> dùng cho ô KPI hẹp. */
export function formatCurrencyCompact(value, opts = {}) {
    return formatCompact(value, { fallback: '—', ...opts });
}

/* ------------------------------------------------------------------ */
/* Số & phần trăm                                                      */
/* ------------------------------------------------------------------ */

/** Số nguyên có dấu phân cách hàng nghìn. */
export function formatNumber(value, { decimals = 0, fallback = '0' } = {}) {
    const n = toNumber(value);
    if (n === null) return fallback;
    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(n);
}

export const fmtNumber = (value) => formatNumber(value);

/**
 * Phần trăm. Mặc định không có phần thập phân.
 * formatPercent(75) -> "75%" | formatPercent(12.345, { decimals: 1 }) -> "12,3%"
 */
export function formatPercent(value, { decimals = 0, fallback = '—', sign = false } = {}) {
    const n = toNumber(value);
    if (n === null) return fallback;
    const text = new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(n);
    const prefix = sign && n > 0 ? '+' : '';
    return `${prefix}${text}%`;
}

/* ------------------------------------------------------------------ */
/* Ngày tháng                                                          */
/* ------------------------------------------------------------------ */

function toDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** 15/09/2026 */
export function formatDate(value, { fallback = '' } = {}) {
    const d = toDate(value);
    if (!d) return fallback;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const fmtDate = (value) => formatDate(value);

/** 15/09/2026 14:30 */
export function formatDateTime(value, { fallback = '' } = {}) {
    const d = toDate(value);
    if (!d) return fallback;
    return `${formatDate(d)} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

/** 15/09 — dùng cho trục biểu đồ, bảng hẹp. */
export function formatDateShort(value, { fallback = '' } = {}) {
    const d = toDate(value);
    if (!d) return fallback;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Thời gian tương đối: "3 giờ trước". */
export function timeAgo(value) {
    const d = toDate(value);
    if (!d) return '';
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} tháng trước`;
    return `${Math.floor(months / 12)} năm trước`;
}

/* ------------------------------------------------------------------ */
/* Khác                                                                */
/* ------------------------------------------------------------------ */

/**
 * Số điện thoại Việt Nam: 0901234567 -> "0901 234 567"
 * Số không đúng định dạng được trả về nguyên trạng.
 */
export function formatPhone(value, { fallback = '' } = {}) {
    if (!value) return fallback;
    const raw = String(value).trim();
    const digits = raw.replace(/\D/g, '');

    if (digits.length === 10 && digits.startsWith('0')) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 11 && digits.startsWith('84')) {
        const local = `0${digits.slice(2)}`;
        return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
    }
    return raw;
}

/** Cắt gọn chuỗi dài, thêm dấu "…". */
export function truncate(value, max = 60) {
    if (!value) return '';
    const s = String(value);
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Chữ cái đầu của tên, dùng cho avatar: "Nguyễn Văn An" -> "NA" (họ + tên gọi) */
export function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
