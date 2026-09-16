'use client';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Lưới KPI — tự xuống hàng trên màn hình nhỏ.
 */
export function StatGrid({ children, className = '' }) {
    return <div className={`ui-kpi-grid ${className}`.trim()}>{children}</div>;
}

/**
 * Thẻ chỉ số (KPI).
 *
 * label   — tên chỉ số
 * value   — giá trị (đã format sẵn)
 * unit    — đơn vị (₫, %, cái...)
 * trend   — { value: 12.5, direction: 'up' | 'down' | 'neutral', label: 'so với kỳ trước' }
 * note    — ghi chú / kỳ tính
 * icon    — icon nhỏ từ lucide-react
 * alert   — true khi chỉ số cần cảnh báo
 *
 * Lưu ý: xu hướng "tăng" không mặc định là tốt. Truyền `goodDirection`
 * để quyết định màu (ví dụ chi phí tăng thì goodDirection = 'down').
 */
export default function StatCard({
    label,
    value,
    unit,
    trend,
    note,
    icon: Icon,
    alert = false,
    href,
    goodDirection = 'up',
    className = '',
}) {
    const Wrapper = href ? Link : 'div';
    const wrapperProps = href ? { href } : {};

    let trendTone = 'neutral';
    if (trend?.direction === 'up') trendTone = goodDirection === 'up' ? 'up' : 'down';
    else if (trend?.direction === 'down') trendTone = goodDirection === 'down' ? 'up' : 'down';

    const TrendIcon = trend?.direction === 'up' ? TrendingUp
        : trend?.direction === 'down' ? TrendingDown
        : Minus;

    return (
        <Wrapper
            {...wrapperProps}
            className={`ui-kpi ${alert ? 'ui-kpi--alert' : ''} ${className}`.trim()}
        >
            <div className="ui-kpi__top">
                <span className="ui-kpi__label">{label}</span>
                {Icon && (
                    <span className="ui-kpi__icon" aria-hidden="true">
                        <Icon size={16} />
                    </span>
                )}
            </div>

            <div className="ui-kpi__value">
                {value}
                {unit && <span className="ui-kpi__unit">{unit}</span>}
            </div>

            {(trend || note) && (
                <div className="ui-kpi__foot">
                    {trend && (
                        <span className={`ui-trend ui-trend--${trendTone}`}>
                            <TrendIcon size={13} aria-hidden="true" />
                            {trend.value}
                            {trend.label && <span className="ui-muted" style={{ fontWeight: 400 }}>{trend.label}</span>}
                        </span>
                    )}
                    {note && <span>{note}</span>}
                </div>
            )}
        </Wrapper>
    );
}
