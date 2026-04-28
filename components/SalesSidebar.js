'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, GitBranch, Users, FileText,
    ClipboardList, ChevronRight, X, Building2,
    Wrench, CalendarDays, CreditCard, Receipt, ShoppingCart, Warehouse, Package,
} from 'lucide-react';
import { useRole, ROLES } from '@/contexts/RoleContext';
import { useState } from 'react';

const DEPT_VIEWS = [
    { key: 'ban_gd',         label: 'Ban GĐ',     icon: '👑' },
    { key: 'kinh_doanh',    label: 'Kinh doanh', icon: '💼' },
    { key: 'xay_dung',      label: 'Xây dựng',   icon: '🏗️' },
    { key: 'hanh_chinh_kt', label: 'Hành chính', icon: '📊' },
    { key: 'xuong',         label: 'Xưởng',      icon: '🪚' },
];

const menuItems = [
    {
        section: 'Tổng quan',
        items: [
            { href: '/sales', icon: LayoutDashboard, label: 'Dashboard', exact: true },
            { href: '/pipeline', icon: GitBranch, label: 'Pipeline' },
        ],
    },
    {
        section: 'Kinh doanh',
        items: [
            { href: '/customers', icon: Users, label: 'Khách hàng' },
            { href: '/quotations', icon: ClipboardList, label: 'Báo giá' },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng' },
            { href: '/projects', icon: Building2, label: 'Dự án' },
            { href: '/products', icon: Package, label: 'Sản phẩm & Vật tư' },
            { href: '/work-orders', icon: Wrench, label: 'Phiếu công việc' },
            { href: '/schedule-templates', icon: CalendarDays, label: 'Mẫu tiến độ' },
        ],
    },
    {
        section: 'Vận hành',
        items: [
            { href: '/payments', icon: CreditCard, label: 'Thu tiền' },
            { href: '/sales/expenses', icon: Receipt, label: 'Chi phí' },
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm VT' },
            { href: '/inventory', icon: Warehouse, label: 'Kho & Tồn kho' },
        ],
    },
];

export default function SalesSidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { roleInfo, role, isPhamDuong, canSwitchRole, viewAsRole, setViewAsRole, actualRole } = useRole();
    const [showDeptPicker, setShowDeptPicker] = useState(false);

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Menu kinh doanh">
            <div className="sidebar-brand">
                <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #8e44ad, #6c3483)' }}>
                    <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                        <path d="M12 8 L12 40" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                        <path d="M12 24 L34 8" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 24 L34 40" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 16 L28 24" stroke="#F47920" strokeWidth="3.5" strokeLinecap="round"/>
                        <path d="M20 32 L28 24" stroke="#F47920" strokeWidth="3.5" strokeLinecap="round"/>
                    </svg>
                </div>
                <div className="brand-text">
                    <span className="brand-name">Phòng Kinh Doanh</span>
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
                <div
                    onClick={() => canSwitchRole && setShowDeptPicker(v => !v)}
                    style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', fontWeight: 600, fontSize: 12, cursor: canSwitchRole ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <span>{roleInfo.icon} {roleInfo.label}</span>
                    {canSwitchRole && <span style={{ fontSize: 10, opacity: 0.7 }}>▲</span>}
                </div>

                {canSwitchRole && showDeptPicker && (
                    <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 8, overflow: 'hidden' }}>
                        {viewAsRole && (
                            <button
                                onClick={() => { setViewAsRole(null); setShowDeptPicker(false); }}
                                style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                                ↩ Về vai trò thật ({ROLES.find(r => r.key === actualRole)?.icon} {ROLES.find(r => r.key === actualRole)?.label || actualRole})
                            </button>
                        )}
                        {DEPT_VIEWS.map(d => (
                            <button
                                key={d.key}
                                onClick={() => { setViewAsRole(d.key); setShowDeptPicker(false); }}
                                style={{
                                    width: '100%', padding: '7px 10px', border: 'none', cursor: 'pointer',
                                    textAlign: 'left', fontSize: 12, fontWeight: role === d.key ? 700 : 400,
                                    background: role === d.key ? 'rgba(255,255,255,0.2)' : 'transparent',
                                    color: role === d.key ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                                }}
                            >
                                {d.icon} {d.label}
                                {role === d.key && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
