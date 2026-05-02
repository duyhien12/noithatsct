'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const NAV_BY_ROLE = {
    kinh_doanh: [
        { href: '/',           icon: '🏠', label: 'Trang chủ' },
        { href: '/customers',  icon: '👥', label: 'Khách hàng' },
        { href: '/quotations', icon: '📋', label: 'Báo giá' },
        { href: '/contracts',  icon: '📄', label: 'Hợp đồng' },
    ],
    xuong: [
        { href: '/',          icon: '🏠', label: 'Trang chủ' },
        { href: '/workshop',  icon: '🔨', label: 'Xưởng' },
        { href: '/tasks',     icon: '✅', label: 'Tác vụ' },
        { href: '/work-orders', icon: '📋', label: 'Phiếu CV' },
    ],
};

const NAV_DEFAULT = [
    { href: '/',          icon: '🏠', label: 'Trang chủ' },
    { href: '/projects',  icon: '🏗️', label: 'Dự án' },
    { href: '/customers', icon: '👥', label: 'Khách hàng' },
    { href: '/tasks',     icon: '✅', label: 'Tác vụ' },
];

export default function MobileBottomNav({ onMenuOpen }) {
    const pathname = usePathname();
    const { role } = useRole();

    const items = NAV_BY_ROLE[role] || NAV_DEFAULT;

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'stretch',
            zIndex: 200,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        }}>
            {items.map(item => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                    <Link key={item.href} href={item.href} style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        textDecoration: 'none',
                        color: isActive ? '#F47920' : 'var(--text-muted)',
                        fontSize: 9,
                        fontWeight: isActive ? 700 : 400,
                        transition: 'color 0.15s',
                        borderTop: isActive ? '2px solid #F47920' : '2px solid transparent',
                        background: isActive ? 'rgba(244,121,32,0.06)' : 'transparent',
                    }}>
                        <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                        <span style={{ letterSpacing: 0.2 }}>{item.label}</span>
                    </Link>
                );
            })}
            <button onClick={onMenuOpen} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                background: 'none',
                border: 'none',
                borderTop: '2px solid transparent',
                color: 'var(--text-muted)',
                fontSize: 9,
                fontWeight: 400,
                cursor: 'pointer',
                padding: 0,
            }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>☰</span>
                <span style={{ letterSpacing: 0.2 }}>Menu</span>
            </button>
        </nav>
    );
}
