'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRole } from '@/contexts/RoleContext';
import Sidebar from '@/components/Sidebar';
import SalesSidebar from '@/components/SalesSidebar';
import WorkshopSidebar from '@/components/WorkshopSidebar';
import Header from '@/components/Header';

export default function AppShell({ children }) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { role } = useRole();

    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    // Login page and public pages: no shell
    const noShellPaths = ['/login', '/gantt-pdf', '/schedule-pdf'];
    const isNoShell = noShellPaths.some(p => pathname.includes(p));

    if (isNoShell || status === 'unauthenticated') {
        return children;
    }

    // Loading state
    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1C3A6B, #2A5298)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#C9A84C', fontSize: 20, fontWeight: 700 }}>H</div>
                    <p style={{ color: '#666' }}>Đang tải...</p>
                </div>
            </div>
        );
    }

    // Choose sidebar based on role (respects viewAsRole for phamduong)
    let SidebarComponent = Sidebar;
    if (role === 'kinh_doanh') SidebarComponent = SalesSidebar;
    else if (role === 'xuong') SidebarComponent = WorkshopSidebar;

    return (
        <div className="app-layout">
            <SidebarComponent isOpen={sidebarOpen} onClose={closeSidebar} />
            <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />
            <div className="main-content">
                <Header onMenuToggle={toggleSidebar} />
                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
