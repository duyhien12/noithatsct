'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const C = {
    primary: '#0f766e', primaryDark: '#0d5c56', primaryLight: '#14b8a6',
    white: '#ffffff', gray: '#64748b', grayLight: '#f8fafc',
    border: '#e2e8f0', text: '#1e293b', textMuted: '#94a3b8',
    sidebarBg: '#0d5c56', sidebarHover: 'rgba(255,255,255,0.1)', sidebarActive: 'rgba(255,255,255,0.18)',
};

const NAV = [
    { section: 'TỔNG QUAN', items: [
        { id: 'dashboard',   label: 'Dashboard',   icon: '▦',   href: '/laocai/dashboard' },
        { id: 'reports',     label: 'Báo cáo',     icon: '📊',  href: '/laocai/reports' },
    ]},
    { section: 'BÁN HÀNG', items: [
        { id: 'customers',   label: 'Khách hàng',  icon: '👥',  href: '/laocai/customers' },
        { id: 'quotations',  label: 'Báo giá',     icon: '📋',  href: '/laocai/quotations' },
        { id: 'contracts',   label: 'Hợp đồng',   icon: '📝',  href: '/laocai/contracts' },
        { id: 'followup',    label: 'Follow-up',   icon: '🔔',  href: '/laocai/followup' },
        { id: 'pipeline',    label: 'Pipeline KH', icon: '⊞',  href: '/laocai/pipeline' },
    ]},
    { section: 'NỘI THẤT', items: [
        { id: 'products',    label: 'Sản phẩm',   icon: '🛋️', href: '/laocai/products' },
        { id: 'categories',  label: 'Danh mục',    icon: '📂',  href: '/laocai/categories' },
    ]},
    { section: 'HỆ THỐNG', items: [
        { id: 'staff',       label: 'Nhân viên',   icon: '👤',  href: '/laocai/staff' },
        { id: 'settings',    label: 'Cài đặt',     icon: '⚙️', href: '/laocai/settings' },
    ]},
];

export default function LcShell({ children, title }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/login');
    }, [status, router]);

    if (status === 'loading' || status === 'unauthenticated') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0fdfa' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#fff', fontSize: 18, fontWeight: 800 }}>LC</div>
                    <p style={{ color: C.gray, fontSize: 13 }}>Đang tải...</p>
                </div>
            </div>
        );
    }

    const user = session?.user;
    const sidebarWidth = collapsed ? 64 : 240;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            {/* Sidebar */}
            <aside style={{
                width: sidebarWidth, minHeight: '100vh',
                background: `linear-gradient(180deg, ${C.sidebarBg} 0%, #0a4a44 100%)`,
                display: 'flex', flexDirection: 'column',
                transition: 'width 0.25s', overflow: 'hidden',
                position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, flexShrink: 0,
            }}>
                {/* Logo */}
                <div style={{ padding: collapsed ? '18px 0' : '18px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }} onClick={() => router.push('/laocai/dashboard')}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>LC</span>
                    </div>
                    {!collapsed && (
                        <div style={{ minWidth: 0 }}>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3, whiteSpace: 'nowrap' }}>Nội Thất SCT</div>
                            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, whiteSpace: 'nowrap' }}>Chi Nhánh Lào Cai</div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
                    {NAV.map(group => (
                        <div key={group.section} style={{ marginBottom: 6 }}>
                            {!collapsed && (
                                <div style={{ padding: '5px 18px 3px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: 1 }}>
                                    {group.section}
                                </div>
                            )}
                            {group.items.map(item => {
                                const isActive = pathname === item.href || (item.href !== '/laocai/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => router.push(item.href)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center',
                                            gap: 9, padding: collapsed ? '9px 0' : '9px 18px',
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                            background: isActive ? C.sidebarActive : 'transparent',
                                            border: 'none', cursor: 'pointer',
                                            color: isActive ? '#fff' : 'rgba(255,255,255,0.68)',
                                            fontSize: 13, fontWeight: isActive ? 600 : 400,
                                            borderLeft: isActive ? '3px solid #5eead4' : '3px solid transparent',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.sidebarHover; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                                        {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* User footer */}
                {!collapsed && (
                    <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {user?.name?.[0] || 'A'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Admin'}</div>
                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Chi nhánh LC</div>
                        </div>
                        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 16, padding: 2, flexShrink: 0 }} title="Về trang chính">⇤</button>
                    </div>
                )}
            </aside>

            {/* Main */}
            <div style={{ flex: 1, marginLeft: sidebarWidth, transition: 'margin-left 0.25s', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {/* Header */}
                <header style={{ height: 58, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14, position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
                    <button onClick={() => setCollapsed(c => !c)} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.border}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: C.gray, flexShrink: 0 }}>☰</button>
                    <h1 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, flex: 1 }}>
                        {title}
                        <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 600, color: C.white, background: C.primary, padding: '2px 8px', borderRadius: 20 }}>Lào Cai</span>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 9, border: `1px solid ${C.border}` }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>
                            {user?.name?.[0] || 'A'}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{user?.name || 'Admin'}</div>
                            <div style={{ fontSize: 10, color: C.gray }}>Chi nhánh Lào Cai</div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, padding: 22, maxWidth: 1280, width: '100%' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
