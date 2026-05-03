'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import {
    Home, Users, ClipboardList, FileText,
    Wrench, Hammer, CheckSquare, Menu,
    Building2, BarChart3,
} from 'lucide-react';

const NAV_BY_ROLE = {
    kinh_doanh: [
        { href: '/',           icon: Home,          label: 'Trang chủ' },
        { href: '/customers',  icon: Users,          label: 'Khách hàng' },
        { href: '/quotations', icon: ClipboardList,  label: 'Báo giá' },
        { href: '/contracts',  icon: FileText,       label: 'Hợp đồng' },
    ],
    xuong: [
        { href: '/',              icon: Home,        label: 'Trang chủ' },
        { href: '/workshop',      icon: Hammer,      label: 'Xưởng' },
        { href: '/tasks',         icon: CheckSquare, label: 'Tác vụ' },
        { href: '/work-orders',   icon: Wrench,      label: 'Phiếu CV' },
    ],
};

const NAV_DEFAULT = [
    { href: '/',          icon: Home,      label: 'Trang chủ' },
    { href: '/projects',  icon: Building2, label: 'Dự án' },
    { href: '/customers', icon: Users,     label: 'Khách hàng' },
    { href: '/tasks',     icon: CheckSquare, label: 'Tác vụ' },
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
            height: 68,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            zIndex: 200,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxShadow: '0 -1px 0 var(--border-color), 0 -4px 16px rgba(0,0,0,0.06)',
        }}>
            {items.map(item => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                    <Link key={item.href} href={item.href} style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        textDecoration: 'none',
                        padding: '8px 4px',
                        minHeight: 68,
                        WebkitTapHighlightColor: 'transparent',
                    }}>
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 56,
                            height: 28,
                            borderRadius: 14,
                            background: isActive ? 'rgba(244,121,32,0.15)' : 'transparent',
                            transition: 'background 0.2s ease',
                        }}>
                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 1.8}
                                color={isActive ? '#F47920' : 'var(--text-muted)'}
                            />
                        </span>
                        <span style={{
                            fontSize: 10,
                            fontWeight: isActive ? 700 : 400,
                            color: isActive ? '#F47920' : 'var(--text-muted)',
                            letterSpacing: 0.1,
                            lineHeight: 1,
                        }}>{item.label}</span>
                    </Link>
                );
            })}
            <button onClick={onMenuOpen} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                padding: '8px 4px',
                minHeight: 68,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
            }}>
                <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 56,
                    height: 28,
                    borderRadius: 14,
                }}>
                    <Menu size={22} strokeWidth={1.8} color="var(--text-muted)" />
                </span>
                <span style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    letterSpacing: 0.1,
                    lineHeight: 1,
                }}>Menu</span>
            </button>
        </nav>
    );
}
