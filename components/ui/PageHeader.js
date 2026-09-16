'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumb dùng chung.
 * items: [{ label: 'Trang chủ', href: '/' }, { label: 'Khách hàng' }]
 */
export function Breadcrumbs({ items = [] }) {
    if (!items.length) return null;

    return (
        <nav aria-label="Đường dẫn">
            <ol className="ui-breadcrumbs">
                {items.map((item, i) => {
                    const last = i === items.length - 1;
                    return (
                        <li key={`${item.label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {item.href && !last
                                ? <Link href={item.href}>{item.label}</Link>
                                : <span className="ui-breadcrumbs__current" aria-current={last ? 'page' : undefined}>{item.label}</span>}
                            {!last && (
                                <span className="ui-breadcrumbs__sep" aria-hidden="true">
                                    <ChevronRight size={12} />
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

/**
 * Tiêu đề trang dùng chung — mọi trang dùng chung một kiểu.
 *
 * <PageHeader
 *   title="Khách hàng"
 *   description="Quản lý khách hàng và quá trình chăm sóc"
 *   breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Khách hàng' }]}
 *   actions={<Button variant="primary">Thêm khách hàng</Button>}
 *   filters={<SearchBar ... />}
 * />
 */
export default function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    filters,
    className = '',
}) {
    return (
        <header className={`ui-page-header ${className}`.trim()}>
            <div>
                {breadcrumbs?.length > 0 && <Breadcrumbs items={breadcrumbs} />}
                <div className="ui-page-header__bar">
                    <div style={{ minWidth: 0 }}>
                        <h1 className="ui-page-header__title">{title}</h1>
                        {description && <p className="ui-page-header__desc">{description}</p>}
                    </div>
                    {actions && <div className="ui-page-header__actions">{actions}</div>}
                </div>
            </div>
            {filters && <div className="ui-page-header__filters">{filters}</div>}
        </header>
    );
}
