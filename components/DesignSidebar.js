'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Building2, Wrench, CalendarDays, FileText, ChevronRight, MessageSquareWarning, Users, DollarSign, PencilRuler, GanttChartSquare, ClipboardList,
} from 'lucide-react';
import SidebarBrand from '@/components/sidebar/SidebarBrand';
import SidebarRoleFooter from '@/components/sidebar/SidebarRoleFooter';
import { useRole } from '@/contexts/RoleContext';

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
        section: 'Dự án & Thi công',
        items: [
            { href: '/customers',           icon: Users,                label: 'Khách hàng' },
            { href: '/design-orders',       icon: PencilRuler,          label: 'Phiếu đặt hàng TK' },
            { href: '/design-orders/gantt', icon: GanttChartSquare,     label: 'Tiến độ (Gantt)' },
            { href: '/design-orders/cv',    icon: ClipboardList,        label: 'CV Thiết kế' },
            { href: '/projects',            icon: Building2,            label: 'Dự án & Tiến độ' },
            { href: '/schedule-templates',  icon: CalendarDays,         label: 'Mẫu tiến độ' },
        ],
    },
    {
        section: 'Tài chính',
        items: [
            { href: '/luong', icon: DollarSign, label: 'Bảng tính lương', exact: true },
        ],
    },
    {
        section: 'Nội bộ',
        items: [
            { href: '/tasks',     icon: FileText,             label: 'Tác vụ' },
            { href: '/proposals', icon: MessageSquareWarning, label: 'Đề xuất - Kiến nghị' },
        ],
    },
];

export default function DesignSidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
    const pathname = usePathname();
    const { roleInfo, role, canSwitchRole, viewAsRole, setViewAsRole, actualRole } = useRole();

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Menu thiết kế">
            <SidebarBrand
                name="Phòng Thiết Kế"
                sub="Kiến Trúc Đô Thị SCT"
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
                onClose={onClose}
            />

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
