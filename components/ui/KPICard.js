'use client';
import StatCard from './StatCard';

/**
 * Giữ API cũ (icon/value/label/trend) — nay dùng StatCard của hệ thống mới.
 * `color` không còn cần thiết (màu lấy từ token) nhưng vẫn nhận để không vỡ trang cũ.
 */
export default function KPICard({ icon, value, label, trend, note, href, goodDirection = 'up' }) {
    const trendObj = (trend === 0 || trend)
        ? {
            value: `${trend > 0 ? '+' : ''}${trend}%`,
            direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral',
        }
        : undefined;

    return (
        <StatCard
            icon={icon}
            label={label}
            value={value}
            trend={trendObj}
            note={note}
            href={href}
            goodDirection={goodDirection}
        />
    );
}
