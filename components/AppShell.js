'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sparkles } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import Sidebar from '@/components/Sidebar';
import SalesSidebar from '@/components/SalesSidebar';
import WorkshopSidebar from '@/components/WorkshopSidebar';
import DesignSidebar from '@/components/DesignSidebar';
import Header from '@/components/Header';
import MobileBottomNav from '@/components/MobileBottomNav';
import AIAssistantPanel from '@/components/ai/AIAssistantPanel';
import { canUseAIAssistant } from '@/lib/aiAssistant/permissions';

const COLLAPSE_KEY = 'homeerp.sidebar.collapsed';

export default function AppShell({ children }) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [showAI, setShowAI] = useState(false);
    const { role } = useRole();
    const canUseAI = canUseAIAssistant(session?.user?.email);

    const router = useRouter();
    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    const toggleCollapsed = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* bỏ qua */ }
            return next;
        });
    }, []);

    // Login page and public pages: no shell
    const noShellPaths = ['/login', '/gantt-pdf', '/schedule-pdf', '/laocai'];
    const isNoShell = noShellPaths.some(p => pathname.includes(p));

    useEffect(() => {
        if (status === 'unauthenticated' && !isNoShell) {
            router.replace('/login');
        }
    }, [status, isNoShell, router]);

    // Khôi phục trạng thái thu gọn sidebar
    useEffect(() => {
        try {
            setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
        } catch { /* bỏ qua */ }
    }, []);

    // Đóng drawer bằng phím Escape trên mobile
    useEffect(() => {
        if (!sidebarOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') closeSidebar(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [sidebarOpen, closeSidebar]);

    // Đóng drawer khi chuyển trang
    useEffect(() => { setSidebarOpen(false); }, [pathname]);

    if (isNoShell) return children;

    if (status === 'unauthenticated') return null;

    // Đang xác thực phiên đăng nhập
    if (status === 'loading') {
        return (
            <div
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100vh', background: 'var(--color-bg)',
                }}
                role="status"
                aria-live="polite"
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                        background: 'var(--color-primary-600)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px', fontSize: 18, fontWeight: 700,
                    }}>H</div>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Đang tải HomeERP…</p>
                </div>
            </div>
        );
    }

    // Chọn sidebar theo vai trò (tôn trọng viewAsRole của phamduong)
    let SidebarComponent = Sidebar;
    if (role === 'kinh_doanh') SidebarComponent = SalesSidebar;
    else if (role === 'xuong') SidebarComponent = WorkshopSidebar;
    else if (role === 'thiet_ke') SidebarComponent = DesignSidebar;

    return (
        <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`.trim()}>
            <a href="#main-content" className="skip-link">Bỏ qua điều hướng</a>

            <SidebarComponent
                isOpen={sidebarOpen}
                onClose={closeSidebar}
                collapsed={collapsed}
                onToggleCollapse={toggleCollapsed}
            />

            <div
                className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
                onClick={closeSidebar}
                aria-hidden="true"
            />

            <div className="main-content">
                <Header onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
                <main className="page-content" id="main-content" tabIndex={-1}>
                    {children}
                </main>
            </div>

            <div className="mobile-bottom-nav-wrapper">
                <MobileBottomNav onMenuOpen={toggleSidebar} />
            </div>

            {canUseAI && !showAI && (
                <button
                    type="button"
                    onClick={() => setShowAI(true)}
                    title="Trợ lý AI"
                    aria-label="Mở trợ lý AI"
                    style={{
                        position: 'fixed', right: 20, bottom: 84, zIndex: 900,
                        width: 48, height: 48, borderRadius: '50%',
                        border: '1px solid var(--color-primary-700)',
                        background: 'var(--color-primary-600)',
                        color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-m)',
                    }}
                >
                    <Sparkles size={20} aria-hidden="true" />
                </button>
            )}
            {canUseAI && showAI && <AIAssistantPanel onClose={() => setShowAI(false)} />}
        </div>
    );
}
