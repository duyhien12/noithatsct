'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Wrench, Building2, ShoppingCart, Package,
    ChevronRight, CalendarDays, Users, FileText,
    BarChart2, Clock, BookOpen, Landmark, Settings,
    ClipboardCheck, NotebookText, Boxes, Factory,
    ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Undo2,
    ClipboardList, Lock, AlertTriangle, Layers, Scissors,
} from 'lucide-react';
import SidebarBrand from '@/components/sidebar/SidebarBrand';
import SidebarRoleFooter from '@/components/sidebar/SidebarRoleFooter';
import { useRole } from '@/contexts/RoleContext';
import { useEffect, useState } from 'react';

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
            { href: '/manufacturing/cutlists', icon: Scissors, label: 'Bóc tách & cutlist' },
            { href: '/workshop/tasks', icon: Wrench, label: 'Công việc xưởng' },
            { href: '/workshop/workers', icon: Users, label: 'Nhân công' },
            { href: '/workshop/work-log', icon: BookOpen, label: 'Nhật ký công việc' },
            { href: '/workshop/work-log/project-summary', icon: BarChart2, label: 'Tổng hợp công CT' },
            { href: '/workshop/plan', icon: CalendarDays, label: 'Kế hoạch & tiến độ' },
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
            { href: '/workshop/plan', icon: CalendarDays, label: 'Kế hoạch & tiến độ' },
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

// Thủ kho (department 'Kho' / 'Mua hàng'): sắp theo luồng nghiệp vụ kho — danh mục → nhập/xuất/tồn
// → bóc tách & cấp phát → kế hoạch mua → xưởng → kiểm kê → báo cáo
const THU_KHO_MENU = [
    {
        section: 'Tổng quan',
        items: [
            { href: '/workshop', icon: LayoutDashboard, label: 'Dashboard xưởng', exact: true },
            { href: '/inventory-v2', icon: Boxes, label: 'Tổng quan kho', exact: true },
        ],
    },
    {
        section: 'Danh mục vật tư',
        items: [
            { href: '/inventory-v2/materials', icon: Package, label: 'Mã hàng · màu · quy cách' },
            { href: '/inventory-v2/settings', icon: Settings, label: 'Kho, vị trí & đơn vị' },
        ],
    },
    {
        section: 'Xuất – nhập – tồn',
        items: [
            { href: '/inventory-v2/documents?group=IMPORT', icon: ArrowDownToLine, label: 'Nhập hàng' },
            { href: '/inventory-v2/documents?group=EXPORT', icon: ArrowUpFromLine, label: 'Cấp vật tư (xuất kho)' },
            { href: '/inventory-v2/documents?group=TRANSFER', icon: ArrowLeftRight, label: 'Điều chuyển' },
            { href: '/inventory-v2/documents?group=RETURN_TO_WAREHOUSE', icon: Undo2, label: 'Trả hàng / hoàn trả' },
            { href: '/inventory-v2/documents', icon: FileText, label: 'Tất cả phiếu kho' },
            { href: '/inventory-v2/stock', icon: Boxes, label: 'Tồn kho hiện tại' },
        ],
    },
    {
        section: 'Bóc tách & cấp phát',
        items: [
            { href: '/manufacturing/cutlists', icon: Scissors, label: 'Bóc tách & cutlist' },
            { href: '/manufacturing/orders', icon: Factory, label: 'Vật tư theo lệnh SX' },
            { href: '/inventory-v2/allocations', icon: ClipboardList, label: 'Phân bổ công trình' },
            { href: '/inventory-v2/documents?group=HOLD', icon: Lock, label: 'Giữ vật tư' },
        ],
    },
    {
        section: 'Kế hoạch mua',
        items: [
            { href: '/inventory-v2/stock?filter=reorder', icon: AlertTriangle, label: 'Thiếu cho sản xuất' },
            { href: '/purchasing?view=xuong', icon: ShoppingCart, label: 'Đơn mua & hàng đang về' },
        ],
    },
    {
        section: 'Quản lý xưởng',
        items: [
            { href: '/manufacturing/kanban', icon: Wrench, label: 'Công đoạn sản xuất' },
            { href: '/workshop/plan', icon: CalendarDays, label: 'Kế hoạch lắp đặt' },
        ],
    },
    {
        section: 'Kiểm kê',
        items: [
            { href: '/inventory-v2/stocktakes', icon: ClipboardCheck, label: 'Kiểm kê & chênh lệch' },
            { href: '/inventory-v2/remnants', icon: Layers, label: 'Phôi dư / vật tư thu hồi' },
        ],
    },
    {
        section: 'Báo cáo',
        items: [
            { href: '/inventory-v2/reports', icon: BarChart2, label: 'Sổ nhập – xuất – tồn' },
            { href: '/inventory-v2/stock?filter=low', icon: AlertTriangle, label: 'Vật tư dưới tối thiểu' },
            { href: '/manufacturing/reports', icon: BarChart2, label: 'Báo cáo sản xuất' },
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
const THU_KHO_DEPARTMENTS = ['Kho', 'Mua hàng'];

// href có query (?group=...) chỉ active khi khớp cả query; href không query active theo tiền tố đường dẫn
// nhưng nhường cho mục có query khớp chính xác hơn
function isItemActive(item, pathname, search, allItems) {
    const [path, query] = item.href.split('?');
    if (query) return pathname === path && search === `?${query}`;
    if (item.exact) return pathname === path;
    if (!pathname.startsWith(path)) return false;
    return !allItems.some(o => o !== item && o.href.includes('?') && o.href.split('?')[0] === pathname && search === `?${o.href.split('?')[1]}`);
}

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
            { href: '/workshop/plan', icon: CalendarDays, label: 'Kế hoạch & tiến độ' },
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
    // Đọc query từ window thay vì useSearchParams để sidebar (nằm trong AppShell) không cần Suspense
    const [search, setSearch] = useState('');
    useEffect(() => { setSearch(window.location.search); }, [pathname]);

    const isSupervisor = SUPERVISOR_EMAILS.includes(email);
    const isThuKho = role === 'xuong' && THU_KHO_DEPARTMENTS.includes(department);
    const menuItems = isSupervisor
        ? SUPERVISOR_MENU
        : isThuKho
        ? THU_KHO_MENU
        : isXuongNhanVien
        ? NHAN_VIEN_MENU
        : FULL_MENU;
    const allItems = menuItems.flatMap(s => s.items).filter(i => i.href);

    const handleNavClick = (href) => {
        setSearch(href?.includes('?') ? `?${href.split('?')[1]}` : '');
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
                                                    onClick={() => handleNavClick(c.href)}
                                                >
                                                    <span>{c.label}</span>
                                                    {childActive && <ChevronRight size={14} className="nav-arrow" />}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                );
                            }
                            const isActive = isItemActive(item, pathname, search, allItems);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    aria-current={isActive ? 'page' : undefined}
                                    onClick={() => handleNavClick(item.href)}
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
