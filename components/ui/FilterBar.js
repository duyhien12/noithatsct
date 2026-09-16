'use client';

/** Hàng bộ lọc — tự xuống dòng trên màn hình hẹp. */
export default function FilterBar({ children, className = '' }) {
    return (
        <div className={`ui-row ${className}`.trim()} style={{ gap: 'var(--space-2)' }}>
            {children}
        </div>
    );
}
