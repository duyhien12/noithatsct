'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, GitBranch, Users, Building2, FileText,
    Package, ClipboardList, Wrench, CreditCard, Receipt,
    ShoppingCart, Truck, Warehouse, Wallet, UserCog,
    BarChart3, ChevronRight, Shield, X, CalendarDays
} from 'lucide-react';
import { useRole, ROLES } from '@/contexts/RoleContext';

const menuItems = [
    {
        section: 'Tổng quan',
        sectionRoles: ['giam_doc', 'pho_gd'], // chỉ ban lãnh đạo (giam_doc, pho_gd) + admin@kientrucsct.com
        isDashboard: true,
        items: [
            { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/pipeline', icon: GitBranch, label: 'Pipeline' },
        ]
    },
    {
        section: 'Quản lý',
        // visible to ALL roles: giam_doc, pho_gd, ke_toan, ky_thuat, kinh_doanh
        items: [
            { href: '/customers', icon: Users, label: 'Khách hàng', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'ky_thuat', 'kinh_doanh'] },
            { href: '/projects', icon: Building2, label: 'Dự án' },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'ky_thuat', 'kinh_doanh'] },
            { href: '/products', icon: Package, label: 'Sản phẩm & Vật tư' },
            { href: '/quotations', icon: ClipboardList, label: 'Báo giá', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'ky_thuat', 'kinh_doanh'] },
            { href: '/work-orders', icon: Wrench, label: 'Phiếu công việc' },
            { href: '/schedule-templates', icon: CalendarDays, label: 'Mẫu tiến độ', roles: ['giam_doc', 'pho_gd', 'ky_thuat', 'kinh_doanh'] },
        ]
    },
    {
        section: 'Vận hành',
        sectionRoles: ['giam_doc', 'pho_gd', 'ke_toan', 'ky_thuat', 'kinh_doanh'], // ky_thuat & kinh_doanh chỉ thấy Chi phí
        items: [
            { href: '/payments', icon: CreditCard, label: 'Thu tiền', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/expenses', icon: Receipt, label: 'Chi phí', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'ky_thuat', 'kinh_doanh'] },
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm VT', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/partners', icon: Truck, label: 'Đối tác (NCC/TP)', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/inventory', icon: Warehouse, label: 'Kho & Tồn kho', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/finance', icon: Wallet, label: 'Tài chính', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
            { href: '/hr', icon: UserCog, label: 'Nhân sự', roles: ['giam_doc', 'pho_gd'] },
        ]
    },
    {
        section: 'Phân tích',
        sectionRoles: ['giam_doc', 'pho_gd', 'ke_toan'], // chỉ ban lãnh đạo & kế toán
        items: [
            { href: '/reports', icon: BarChart3, label: 'Báo cáo', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        ]
    },
];

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { role, roleInfo, canViewDashboard } = useRole();

    const handleNavClick = () => {
        // Close sidebar on mobile after navigating
        if (window.innerWidth <= 768) {
            onClose();
        }
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Menu chính">
            <div className="sidebar-brand">
                <div className="brand-icon">
                    <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                        <path d="M12 8 L12 40" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                        <path d="M12 24 L34 8" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 24 L34 40" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 16 L28 24" stroke="#F47920" strokeWidth="3.5" strokeLinecap="round"/>
                        <path d="M20 32 L28 24" stroke="#F47920" strokeWidth="3.5" strokeLinecap="round"/>
                    </svg>
                </div>
                <div className="brand-text">
                    <span className="brand-name">Kiến Trúc Đô Thị SCT</span>
                    <span className="brand-sub">Cùng bạn xây dựng ước mơ</span>
                </div>
                <button
                    className="mobile-menu-btn"
                    onClick={onClose}
                    aria-label="Đóng menu"
                    style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)' }}
                >
                    <X size={20} />
                </button>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map((section) => {
                    // Check section-level role restriction
                    if (section.sectionRoles) {
                        if (section.isDashboard) {
                            if (!canViewDashboard) return null;
                        } else if (!section.sectionRoles.includes(role)) {
                            return null;
                        }
                    }
                    const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(role));
                    if (visibleItems.length === 0) return null;
                    return (
                        <div className="nav-section" key={section.section}>
                            <div className="nav-section-title">{section.section}</div>
                            {visibleItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                        aria-current={isActive ? 'page' : undefined}
                                        onClick={handleNavClick}
                                    >
                                        <span className="nav-icon">
                                            <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                                        </span>
                                        <span>{item.label}</span>
                                        {item.badge && <span className="nav-badge">{item.badge}</span>}
                                        {isActive && <ChevronRight size={14} className="nav-arrow" />}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={12} /> Vai trò
                </div>
                <div style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.15)',
                    color: '#FFFFFF', fontWeight: 600, fontSize: 12,
                }}>
                    {roleInfo.icon} {roleInfo.label}
                </div>
            </div>
        </aside>
    );
}
