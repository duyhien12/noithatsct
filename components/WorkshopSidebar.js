'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Wrench, Building2, ShoppingCart, Package,
    ChevronRight, X, CalendarDays, Users, FileText, Warehouse,
    BarChart2, Clock,
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

const FULL_MENU = [
    {
        section: 'Tổng quan',
        items: [
            { href: '/workshop', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        ],
    },
    {
        section: 'Dự án & Hợp đồng',
        items: [
            { href: '/projects', icon: Building2, label: 'Dự án & Tiến độ' },
            { href: '/schedule-templates', icon: CalendarDays, label: 'Mẫu tiến độ' },
            { href: '/customers', icon: Users, label: 'Khách hàng' },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng' },
        ],
    },
    {
        section: 'Xưởng',
        items: [
            { href: '/workshop/tasks', icon: Wrench, label: 'Công việc xưởng' },
            { href: '/workshop/workers', icon: Users, label: 'Nhân công' },
            { href: '/workshop/timeline', icon: BarChart2, label: 'Tiến độ (Gantt)' },
            { href: '/work-orders', icon: Clock, label: 'Phiếu công việc' },
        ],
    },
    {
        section: 'Kho & Mua sắm',
        items: [
            { href: '/inventory', icon: Warehouse, label: 'Kho & Tồn kho' },
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm VT' },
            { href: '/workshop/materials', icon: Package, label: 'Vật tư kho' },
            { href: '/products', icon: Package, label: 'Danh mục sản phẩm' },
        ],
    },
];

// Nhân viên xưởng chỉ xem 3 mục này
const NHAN_VIEN_MENU = [
    {
        section: 'Xưởng',
        items: [
            { href: '/workshop/tasks', icon: Wrench, label: 'Công việc xưởng' },
            { href: '/workshop/workers', icon: Users, label: 'Nhân công' },
            { href: '/workshop/timeline', icon: BarChart2, label: 'Tiến độ (Gantt)' },
        ],
    },
];

export default function WorkshopSidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { roleInfo, isXuongNhanVien, department } = useRole();

    const menuItems = isXuongNhanVien ? NHAN_VIEN_MENU : FULL_MENU;

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Menu xưởng nội thất">
            <div className="sidebar-brand">
                <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #d35400, #a04000)' }}>
                    <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                        <path d="M12 8 L12 40" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                        <path d="M12 24 L34 8" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 24 L34 40" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 16 L28 24" stroke="#F47920" strokeWidth="3.5" strokeLinecap="round"/>
                        <path d="M20 32 L28 24" stroke="#F47920" strokeWidth="3.5" strokeLinecap="round"/>
                    </svg>
                </div>
                <div className="brand-text">
                    <span className="brand-name">Xưởng Nội Thất</span>
                    <span className="brand-sub">Kiến Trúc Đô Thị SCT</span>
                </div>
                <button className="mobile-menu-btn" onClick={onClose} aria-label="Đóng menu" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)' }}>
                    <X size={20} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((section) => (
                    <div className="nav-section" key={section.section}>
                        <div className="nav-section-title">{section.section}</div>
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.exact
                                ? pathname === item.href
                                : pathname.startsWith(item.href);
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
                                    {isActive && <ChevronRight size={14} className="nav-arrow" />}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    Vai trò
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', fontWeight: 600, fontSize: 12 }}>
                    {roleInfo.icon} {roleInfo.label}{department ? ` · ${department}` : ''}
                </div>
            </div>
        </aside>
    );
}
