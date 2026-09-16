'use client';

/**
 * Card dùng chung: nền trắng, viền xám nhạt, shadow rất nhẹ, radius 12px.
 *
 * <Card title="Dự án gần đây" actions={<Button .../>}>
 *   ...nội dung...
 * </Card>
 *
 * Dùng `flush` khi nội dung là bảng (bỏ padding của body).
 */
export default function Card({
    title,
    subtitle,
    actions,
    footer,
    flush = false,
    as: Tag = 'section',
    className = '',
    bodyClassName = '',
    children,
    ...rest
}) {
    return (
        <Tag className={`ui-card ${flush ? 'ui-card--flush' : ''} ${className}`.trim()} {...rest}>
            {(title || actions) && (
                <header className="ui-card__header">
                    <div style={{ minWidth: 0 }}>
                        {title && <h2 className="ui-card__title">{title}</h2>}
                        {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
                    </div>
                    {actions && <div className="ui-row">{actions}</div>}
                </header>
            )}
            <div className={`ui-card__body ${flush ? 'ui-card__body--flush' : ''} ${bodyClassName}`.trim()}>
                {children}
            </div>
            {footer && <footer className="ui-card__footer">{footer}</footer>}
        </Tag>
    );
}

export function CardGrid({ minWidth = 280, children, className = '' }) {
    return (
        <div
            className={className}
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}px, 100%), 1fr))`,
                gap: 'var(--space-4)',
            }}
        >
            {children}
        </div>
    );
}
