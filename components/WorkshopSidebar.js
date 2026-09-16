'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Wrench, Building2, ShoppingCart, Package,
    ChevronRight, CalendarDays, Users, FileText, Warehouse,
    BarChart2, Clock, BookOpen, Landmark, Settings,
    ClipboardCheck, NotebookText, Boxes, Factory,
} from 'lucide-react';
import SidebarBrand from '@/components/sidebar/SidebarBrand';
import SidebarRoleFooter from '@/components/sidebar/SidebarRoleFooter';
import { useRole } from '@/contexts/RoleContext';
import { useState } from 'react';

const DEPT_VIEWS = [
    { key: 'ban_gd',         label: 'Ban GĐ',     icon: '👑' },
    { key: 'kinh_doanh',    label: 'Kinh doanh', icon: '💼' },
    { key: 'marketing',     label: 'Marketing',  icon: '📣' },
    { key: 'xay_dung',      label: 'Xây dựng',   icon: '🏗️' },
    { key: 'hanh_chinh_kt', label: 'Hành chính', icon: '📊' },
    { key: 'xuong',         label: 'Xưởng',      icon: '🪚' },
];

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
            { href: '/maintenance', icon: Settings, label: 'Bảo dưỡng' },
        ],
    },
    {
        section: 'Quản lý Xưởng',
        items: [
            { href: '/manufacturing/orders', icon: Factory, label: 'Lệnh sản xuất' },
            { href: '/workshop/tasks', icon: Wrench, label: 'Công việc xưởng' },
            { href: '/workshop/workers', icon: Users, label: 'Nhân công' },
            { href: '/workshop/work-log', icon: BookOpen, label: 'Nhật ký công việc' },
            { href: '/workshop/work-log/project-summary', icon: BarChart2, label: 'Tổng hợp công CT' },
            { href: '/workshop/timeline', icon: BarChart2, label: 'Tiến độ (Gantt)' },
            { href: '/work-orders', icon: Clock, label: 'Phiếu công việc' },
            { href: '/cost-management', icon: BarChart2, label: 'Giá thành xưởng' },
        ],
    },
    {
        section: 'Giám sát công trình',
        items: [
            { href: '/workshop/supervision', icon: ClipboardCheck, label: 'Checklist giám sát' },
        ],
    },
    {
        section: 'Kho & Mua sắm',
        items: [
            { href: '/inventory-v2', icon: Boxes, label: 'Kho vật tư 2.0' },
            { href: '/purchasing?view=xuong', icon: ShoppingCart, label: 'Mua sắm vật tư' },
            { href: '/products', icon: Package, label: 'Danh mục sản phẩm' },
        ],
    },
    {
        section: 'Tài chính xưởng',
        items: [
            { icon: NotebookText, label: 'Nhật ký Thu – Chi',
              children: [
                  { href: '/finance/journal', label: 'Tổng hợp Thu – Chi' },
                  { href: '/finance/journal/project-costs', label: 'Tổng chi phí công trình' },
                  { href: '/finance/journal/advances', label: 'Tạm ứng nhân viên' },
                  { href: '/finance/journal/payables', label: 'Công nợ NCC / Nhà phân phối' },
                  { href: '/finance/journal/receivables', label: 'Công nợ Khách hàng' },
              ] },
            { href: '/workshop/assets', icon: Landmark, label: 'Tài sản cố định' },
            { href: '/workshop/pl', icon: BarChart2, label: 'P&L Xưởng' },
        ],
    },
    {
        section: 'Nội bộ',
        items: [
            { href: '/tasks', icon: Wrench, label: 'Tác vụ' },
            { href: '/proposals', icon: FileText, label: 'Đề xuất - Kiến nghị' },
        ],
    },
];

// Nhân viên xưởng chỉ xem các mục cơ bản (bao gồm Thủ kho/Nhân viên sản xuất — cần vào Kho 2.0)
const NHAN_VIEN_MENU = [
    {
        section: 'Quản lý Xưởng',
        items: [
            { href: '/workshop/tasks', icon: Wrench, label: 'Công việc xưởng' },
            { href: '/workshop/workers', icon: Users, label: 'Nhân công' },
            { href: '/workshop/work-log', icon: BookOpen, label: 'Nhật ký công việc' },
            { href: '/workshop/work-log/project-summary', icon: BarChart2, label: 'Tổng hợp công CT' },
            { href: '/workshop/timeline', icon: BarChart2, label: 'Tiến độ (Gantt)' },
        ],
    },
    {
        section: 'Kho & Mua sắm',
        items: [
            { href: '/inventory-v2', icon: Boxes, label: 'Kho vật tư 2.0' },
        ],
    },
];

// Giám sát nội thất: theo dõi dự án/tiến độ/công việc, không cần tài chính, mua sắm, sản xuất
const SUPERVISOR_MENU = [
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
        ],
    },
    {
        section: 'Quản lý Xưởng',
        items: [
            { href: '/workshop/tasks', icon: Wrench, label: 'Công việc xưởng' },
            { href: '/workshop/workers', icon: Users, label: 'Nhân công' },
            { href: '/workshop/work-log', icon: BookOpen, label: 'Nhật ký công việc' },
            { href: '/workshop/work-log/project-summary', icon: BarChart2, label: 'Tổng hợp công CT' },
            { href: '/workshop/timeline', icon: BarChart2, label: 'Tiến độ (Gantt)' },
            { href: '/work-orders', icon: Clock, label: 'Phiếu công việc' },
        ],
    },
    {
        section: 'Giám sát công trình',
        items: [
            { href: '/workshop/supervision', icon: ClipboardCheck, label: 'Checklist giám sát' },
        ],
    },
    {
        section: 'Kho & Mua sắm',
        items: [
            { href: '/inventory', icon: Warehouse, label: 'Kho & Tồn kho' },
            { href: '/workshop/materials', icon: Package, label: 'Vật tư kho' },
        ],
    },
    {
        section: 'Nội bộ',
        items: [
            { href: '/tasks', icon: Wrench, label: 'Tác vụ' },
            { href: '/proposals', icon: FileText, label: 'Đề xuất - Kiến nghị' },
        ],
    },
];

const SUPERVISOR_EMAILS = ['huuhung@kientrucsct.com'];

export default function WorkshopSidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
    const pathname = usePathname();
    const { roleInfo, isXuongNhanVien, department, canSwitchRole, viewAsRole, setViewAsRole, actualRole, role, email } = useRole();
    const [openParents, setOpenParents] = useState({});

    const isVanToan = email === 'vantoan@kientrucsct.com';
    const isSupervisor = SUPERVISOR_EMAILS.includes(email);
    const menuItems = isSupervisor
        ? SUPERVISOR_MENU
        : isXuongNhanVien
        ? (isVanToan
            ? NHAN_VIEN_MENU.map(s => s.section === 'Kho & Mua sắm'
                ? { ...s, items: [{ href: '/inventory', icon: Warehouse, label: 'Kho & Tồn kho' }, ...s.items] }
                : s)
            : NHAN_VIEN_MENU)
        : FULL_MENU;

    const handleNavClick = () => {
        if (window.innerWidth <= 768) onClose();
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="Menu xưởng nội thất">
            <SidebarBrand
                name="Xưởng Nội Thất"
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
