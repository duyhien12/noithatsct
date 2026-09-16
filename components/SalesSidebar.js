'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, GitBranch, Users, FileText,
    ClipboardList, ChevronRight, Building2,
    Wrench, CalendarDays, ShoppingCart, Warehouse, Package, BarChart3, Banknote, BookMarked, GanttChart, Calendar, CheckSquare, PencilRuler, GraduationCap, NotebookText,
} from 'lucide-react';
import SidebarBrand from '@/components/sidebar/SidebarBrand';
import SidebarRoleFooter from '@/components/sidebar/SidebarRoleFooter';
import { useRole } from '@/contexts/RoleContext';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

const DEPT_VIEWS = [
    { key: 'ban_gd',         label: 'Ban GĐ',     icon: '👑' },
    { key: 'kinh_doanh',    label: 'Kinh doanh', icon: '💼' },
    { key: 'marketing',     label: 'Marketing',  icon: '📣' },
    { key: 'xay_dung',      label: 'Xây dựng',   icon: '🏗️' },
    { key: 'hanh_chinh_kt', label: 'Hành chính', icon: '📊' },
    { key: 'xuong',         label: 'Xưởng',      icon: '🪚' },
];

const menuItems = [
    {
        section: 'Tổng quan',
        items: [
            { href: '/sales', icon: LayoutDashboard, label: 'Dashboard', exact: true },
            { href: '/pipeline', icon: GitBranch, label: 'Pipeline KD' },
        ],
    },
    {
        section: 'Khách hàng & Bán hàng',
        items: [
            { href: '/customers', icon: Users, label: 'Khách hàng' },
            { href: '/quotations', icon: ClipboardList, label: 'Báo giá' },
            { href: '/design-orders', icon: PencilRuler, label: 'Phiếu đặt hàng TK' },
            { href: '/contracts', icon: FileText, label: 'Hợp đồng' },
        ],
    },
    {
        section: 'Dự án & Công việc',
        items: [
            { href: '/projects', icon: Building2, label: 'Dự án & Tiến độ' },
            { href: '/sales/production-gantt', icon: GanttChart, label: 'Tiến độ sản xuất (Gantt)' },
            { href: '/schedule-templates', icon: CalendarDays, label: 'Mẫu tiến độ' },
            { href: '/work-orders', icon: Wrench, label: 'Phiếu công việc' },
            { href: '/products', icon: Package, label: 'Sản phẩm & Vật tư' },
            { href: '/tasks', icon: CheckSquare, label: 'Tác vụ' },
            { href: '/lessons-learned', icon: GraduationCap, label: '📚 Bài học dự án' },
        ],
    },
    {
        section: 'Marketing',
        items: [
            { href: '/marketing/calendar', icon: Calendar, label: 'Lịch công việc Marketing' },
        ],
    },
    {
        section: 'Tài chính & Mua sắm',
        items: [
            { icon: NotebookText, label: 'Nhật ký Thu – Chi',
              children: [
                  { href: '/finance/journal', label: 'Tổng hợp Thu – Chi' },
                  { href: '/finance/journal/project-costs', label: 'Tổng chi phí công trình' },
                  { href: '/finance/journal/advances', label: 'Tạm ứng nhân viên' },
                  { href: '/finance/journal/payables', label: 'Công nợ NCC / Nhà phân phối' },
                  { href: '/finance/journal/receivables', label: 'Công nợ Khách hàng' },
              ] },
            { href: '/finance/kinh-doanh', icon: BarChart3, label: 'Tổng hợp chi phí KD' },
            { href: '/finance/luong-chi-phi', icon: Banknote, label: 'Lương & Chi phí cố định' },
            { href: '/finance/tong-hop', icon: BookMarked, label: 'Báo cáo tổng hợp 2 phòng' },
            { href: '/purchasing', icon: ShoppingCart, label: 'Mua sắm vật tư' },
            { href: '/inventory', icon: Warehouse, label: 'Kho & Tồn kho' },
        ],
    },
];

export default function SalesSidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
    const pathname = usePathname();
    const { roleInfo, role, canSwitchRole, viewAsRole, setViewAsRole, actualRole } = useRole();
    const { data: session } = useSession();
    const isDuyHien = session?.user?.email === 'duyhien@kientrucsct.com';
    const [openParents, setOpenParents] = useState({});

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Menu kinh doanh">
            <SidebarBrand
                name="Phòng Kinh Doanh"
                sub="Kiến Trúc Đô Thị SCT"
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
                onClose={onClose}
            />

            <nav className="sidebar-nav">
                {menuItems.map((section) => (
                    <div className="nav-section" key={section.section}>
                        <div className="nav-section-title">{section.section}</div>
                        {section.items.filter(item => {
                            if (isDuyHien && [
                                '/work-orders', '/products',
                                '/finance/kinh-doanh',
                                '/finance/luong-chi-phi', '/finance/tong-hop',
                                '/purchasing', '/inventory',
                            ].includes(item.href)) return false;
                            return true;
                        }).map((item) => {
                            const Icon = item.icon;
                            if (item.children) {
                                const isParentActive = item.children.some(c => pathname.startsWith(c.href));
                                const isOpen = openParents[item.label] !== undefined ? openParents[item.label] : isParentActive;
                                return (
                                    <div key={item.label}>
                                        <button
                                            type="button"
                                            className={`nav-item ${isParentActive ? 'active' : ''}`}
                                            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                            onClick={() => setOpenParents(m => ({ ...m, [item.label]: !isOpen }))}
                                        >
                                            <span className="nav-icon">
                                                <Icon size={18} strokeWidth={isParentActive ? 2 : 1.5} />
                                            </span>
                                            <span style={{ flex: 1 }}>{item.label}</span>
                                            <ChevronRight size={14} className="nav-arrow" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                                        </button>
                                        {isOpen && item.children.map(c => {
                                            const childActive = pathname.startsWith(c.href);
                                            return (
                                                <Link
                                                    key={c.href}
                                                    href={c.href}
                                                    className={`nav-item ${childActive ? 'active' : ''}`}
                                                    aria-current={childActive ? 'page' : undefined}
                                                    style={{ paddingLeft: 40 }}
                                                    onClick={handleNavClick}
                                                >
                                                    <span>{c.label}</span>
                                                    {childActive && <ChevronRight size={14} className="nav-arrow" />}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                );
                            }
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

            <SidebarRoleFooter
                roleInfo={roleInfo}
                role={role}
                actualRole={actualRole}
                canSwitchRole={canSwitchRole}
                viewAsRole={viewAsRole}
                setViewAsRole={setViewAsRole}
                deptViews={DEPT_VIEWS}
            />
        </aside>
    );
}
