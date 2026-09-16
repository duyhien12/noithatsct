'use client';
import Badge, { toneOf } from './Badge';

/**
 * Giữ nguyên API cũ (`status`, `colorMap`) để 130 trang hiện có không phải sửa,
 * nhưng màu nay lấy từ bảng tone dùng chung trong Badge.js.
 *
 * `colorMap` cũ nhận { 'Trạng thái': { bg, text } }. Nếu trang nào còn truyền,
 * ta chỉ dùng nó để suy ra tone gần nhất chứ không hardcode màu nữa —
 * đảm bảo cùng một trạng thái có cùng một màu trên toàn hệ thống.
 */
const LEGACY_HEX_TO_TONE = {
    '#2563EB': 'info', '#1D4ED8': 'info', '#3B82F6': 'info',
    '#059669': 'success', '#16A34A': 'success', '#15803D': 'success',
    '#D97706': 'warning', '#CA8A04': 'warning', '#EA580C': 'warning',
    '#DC2626': 'danger', '#B91C1C': 'danger',
    '#7C3AED': 'purple', '#9333EA': 'purple', '#DB2777': 'purple',
    '#64748B': 'neutral', '#475569': 'neutral', '#6B7280': 'neutral',
};

export default function StatusBadge({ status, colorMap = {}, tone, size, ...rest }) {
    let resolved = tone;

    if (!resolved && colorMap[status]?.text) {
        resolved = LEGACY_HEX_TO_TONE[String(colorMap[status].text).toUpperCase()];
    }
    if (!resolved) resolved = toneOf(status);

    return <Badge tone={resolved} size={size} {...rest}>{status}</Badge>;
}
