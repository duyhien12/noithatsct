'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, GitBranch, Users, Building2, FileText,
    Package, ClipboardList, Wrench, CreditCard, Receipt,
    ShoppingCart, Truck, Warehouse, Wallet, UserCog,
    BarChart3, ChevronRight, Shield, X, CalendarDays, HardHat, Banknote, TrendingUp
} from 'lucide-react';
import { useRole, ROLES } from '@/contexts/RoleContext';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

// Nhóm role để dễ quản lý
const BAN_GD     = ['ban_gd', 'giam_doc', 'pho_gd'];           // Ban giám đốc (cả cũ lẫn mới)
const KY_THUAT   = ['xay_dung', 'thiet_ke', 'xuong', 'ky_thuat']; // Kỹ thuật / xưởng
const KE_TOAN    = ['hanh_chinh_kt', 'ke_toan'];                // Kế toán / hành chính
const KINH_DOANH = ['kinh_doanh', 'marketing'];                 // Kinh doanh / marketing
const VIEWER     = ['viewer'];                                   // Chỉ xem

const menuItems = [
    {
        section: 'Tổng quan',
        isDashboard: true,
        items: [
            { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { href: '/pipeline', icon: GitBranch, label: 'Pipeline KD' },
        ],
    },
    {
        section: 'Khách hàng & Bán hàng',
        items: [
            { href: '/customers', icon: Users, label: 'Khách hàng',
              roles: [...BAN_GD, ...KE_TOAN, ...KINH_DOANH, ...VIEWER, 'xay_dung', 'thiet_ke'] },
            { href: '/quotations', icon: ClipboardList, label: 'Báo giá',
              roles: [...BAN_GD, ...KE_TOAN, ...KINH_DOANH, ...VIEWER, 'xay_dung', 'thiet_ke'] },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng',
              roles: [...BAN_GD, ...KE_TOAN, ...KINH_DOANH, ...VIEWER, 'xay_dung', 'thiet_ke'] },
        ],
    },
    {
        section: 'Dự án & Thi công',
        items: [
            { href: '/projects', icon: Building2, label: 'Dự án & Tiến độ' },
            { href: '/work-orders', icon: Wrench, label: 'Phiếu công việc' },
            { href: '/schedule-templates', icon: CalendarDays, label: 'Mẫu tiến độ' },
            { href: '/products', icon: Package, label: 'Sản phẩm & Vật tư',
              roles: [...BAN_GD, ...KE_TOAN, ...KINH_DOANH, ...VIEWER, 'xay_dung', 'thiet_ke'] },
        ],
    },
    {
        section: 'Tài chính',
        sectionRoles: [...BAN_GD, ...KE_TOAN, ...KY_THUAT, ...KINH_DOANH, ...VIEWER],
        items: [
            { href: '/payments', icon: CreditCard, label: 'Thu tiền',
              roles: [...BAN_GD, ...KE_TOAN, ...VIEWER] },
            { href: '/expenses', icon: Receipt, label: 'Chi phí',
              roles: [...BAN_GD, ...KE_TOAN, ...KY_THUAT, ...KINH_DOANH, ...VIEWER] },
            { href: '/finance', icon: Wallet, label: 'Tổng hợp tài chính',
              roles: [...BAN_GD, ...KE_TOAN, ...VIEWER] },
        ],
    },
    {
        section: 'Mua sắm & Kho',
        sectionRoles: [...BAN_GD, ...KE_TOAN, ...KY_THUAT, ...KINH_DOANH, ...VIEWER],
        items: [
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm vật tư',
              roles: [...BAN_GD, ...KE_TOAN, ...KY_THUAT, ...KINH_DOANH, ...VIEWER] },
            { href: '/partners', icon: Truck, label: 'Đối tác (NCC / Thầu phụ)',
              roles: [...BAN_GD, ...KE_TOAN, ...VIEWER] },
            { href: '/inventory', icon: Warehouse, label: 'Kho & Tồn kho',
              roles: [...BAN_GD, ...KE_TOAN, ...VIEWER, ...KY_THUAT] },
        ],
    },
    {
        section: 'Xưởng Nội Thất',
        sectionRoles: [...BAN_GD, ...VIEWER, 'xuong', 'ke_toan', 'hanh_chinh_kt'],
        items: [
            { href: '/workshop', icon: LayoutDashboard, label: 'Dashboard xưởng',
              roles: [...BAN_GD, ...VIEWER, 'xuong'] },
            { href: '/workshop/tasks', icon: Wrench, label: 'Công việc xưởng',
              roles: [...BAN_GD, ...VIEWER, 'xuong'] },
            { href: '/workshop/workers', icon: HardHat, label: 'Nhân công',
              roles: [...BAN_GD, ...VIEWER, 'xuong'] },
            { href: '/workshop/expenses', icon: Banknote, label: 'Tài chính xưởng',
              roles: [...BAN_GD, ...VIEWER, 'xuong', 'ke_toan', 'hanh_chinh_kt'] },
            { href: '/workshop/pl', icon: TrendingUp, label: 'P&L Xưởng',
              roles: [...BAN_GD, ...VIEWER, 'xuong', 'ke_toan', 'hanh_chinh_kt'] },
            { href: '/workshop/assets', icon: BarChart3, label: 'Tài sản cố định',
              roles: [...BAN_GD, ...VIEWER, 'xuong', 'ke_toan', 'hanh_chinh_kt'] },
        ],
    },
    {
        section: 'Nhân sự & Hành chính',
        sectionRoles: [...BAN_GD, ...KE_TOAN, ...VIEWER],
        items: [
            { href: '/hr', icon: UserCog, label: 'Nhân sự',
              roles: [...BAN_GD, ...VIEWER] },
            { href: '/hr/accounts', icon: Shield, label: 'Tài khoản hệ thống',
              roles: [...BAN_GD, ...VIEWER] },
        ],
    },
    {
        section: 'Nội bộ',
        items: [
            { href: '/tasks', icon: Wrench, label: 'Tác vụ' },
            { href: '/proposals', icon: FileText, label: 'Đề xuất - Kiến nghị' },
            { href: '/reports', icon: BarChart3, label: 'Báo cáo',
              roles: [...BAN_GD, ...KE_TOAN, ...VIEWER] },
        ],
    },
];

const DEPT_VIEWS = [
    { key: 'ban_gd',        label: 'Ban GĐ',      icon: '👑' },
    { key: 'kinh_doanh',   label: 'Kinh doanh',  icon: '💼' },
    { key: 'xay_dung',     label: 'Xây dựng',    icon: '🏗️' },
    { key: 'hanh_chinh_kt',label: 'Hành chính',  icon: '📊' },
    { key: 'xuong',        label: 'Xưởng',       icon: '🪚' },
];

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { role, roleInfo, canViewDashboard, isPhamDuong, canSwitchRole, viewAsRole, setViewAsRole, actualRole } = useRole();
    const { data: session } = useSession();
    const isNgocBinh = session?.user?.email === 'ngocbinh@kientrucsct.com';
    const [showDeptPicker, setShowDeptPicker] = useState(false);

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose();
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
                <button className="mobile-menu-btn" onClick={onClose} aria-label="Đóng menu" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)' }}>
                    <X size={20} />
                </button>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map((section) => {
                    if (section.sectionRoles) {
                        if (section.isDashboard) {
                            if (!canViewDashboard) return null;
                        } else if (!section.sectionRoles.includes(role)) {
                            return null;
                        }
                    }
                    if (section.isDashboard && !canViewDashboard) return null;
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
                {(isNgocBinh || BAN_GD.includes(role)) && (
                    <div className="nav-section">
                        <div className="nav-section-title">Nhân sự</div>
                        <Link
                            href="/luong"
                            className={`nav-item ${pathname.startsWith('/luong') ? 'active' : ''}`}
                            onClick={handleNavClick}
                        >
                            <span className="nav-icon"><Wallet size={18} strokeWidth={pathname.startsWith('/luong') ? 2 : 1.5} /></span>
                            <span>Tính lương</span>
                            {pathname.startsWith('/luong') && <ChevronRight size={14} className="nav-arrow" />}
                        </Link>
                    </div>
                )}
            </nav>

            <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={12} /> Vai trò
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
