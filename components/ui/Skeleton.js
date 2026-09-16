'use client';
import { useEffect, useState } from 'react';

/** Khối xám nhấp nháy thay cho chữ "Đang tải...". */
export default function Skeleton({ width, height = 12, radius, className = '', style }) {
    return (
        <span
            className={`ui-skeleton ${className}`.trim()}
            aria-hidden="true"
            style={{ width, height, borderRadius: radius, ...style }}
        />
    );
}

/** Skeleton cho card — giữ đúng chiều cao để bố cục không nhảy khi có dữ liệu. */
export function SkeletonCard({ lines = 3 }) {
    return (
        <div className="ui-skeleton-card" aria-hidden="true">
            <Skeleton height={18} width="45%" />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
                ))}
            </div>
        </div>
    );
}

/** Skeleton cho lưới KPI. */
export function SkeletonStats({ count = 4 }) {
    return (
        <div className="ui-kpi-grid" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="ui-kpi">
                    <Skeleton height={12} width="55%" />
                    <Skeleton height={24} width="70%" />
                    <Skeleton height={11} width="40%" />
                </div>
            ))}
        </div>
    );
}

/** Skeleton cho bảng — số cột/dòng khớp bảng thật để tránh nhảy bố cục. */
export function SkeletonTable({ rows = 6, columns = 5 }) {
    return (
        <div className="ui-table-wrap" aria-hidden="true">
            <table className="ui-table">
                <thead>
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i}><Skeleton height={10} width="70%" /></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r}>
                            {Array.from({ length: columns }).map((_, c) => (
                                <td key={c}><Skeleton height={12} width={c === 0 ? '80%' : '55%'} /></td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Spinner({ size = 'md', className = '', label }) {
    return (
        <span
            className={`ui-spinner ${size === 'lg' ? 'ui-spinner--lg' : ''} ${className}`.trim()}
            role={label ? 'status' : undefined}
            aria-label={label}
        />
    );
}

/**
 * Bọc vùng đang tải. Nếu quá `slowAfter` ms mà chưa xong thì hiện
 * thông báo "Dữ liệu đang tải lâu hơn dự kiến." kèm nút Thử lại.
 */
export function LoadingArea({ loading, slowAfter = 8000, onRetry, skeleton, children }) {
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        if (!loading) { setSlow(false); return; }
        const t = setTimeout(() => setSlow(true), slowAfter);
        return () => clearTimeout(t);
    }, [loading, slowAfter]);

    if (!loading) return children;

    return (
        <div aria-busy="true">
            {skeleton}
            {slow && (
                <div className="ui-slow-hint" role="status">
                    <span>Dữ liệu đang tải lâu hơn dự kiến.</span>
                    {onRetry && (
                        <button type="button" className="ui-btn ui-btn--outline ui-btn--sm" onClick={onRetry}>
                            Thử lại
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
