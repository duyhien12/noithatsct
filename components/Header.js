'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Sun, Moon, Bell, Settings, LogOut, Search, Menu, ChevronDown } from 'lucide-react';

const ROLE_LABELS = {
    ban_gd:        { label: 'Ban giám đốc',             icon: '👑' },
    kinh_doanh:    { label: 'Phòng kinh doanh',         icon: '💼' },
    xay_dung:      { label: 'Phòng xây dựng',           icon: '🏗️' },
    thiet_ke:      { label: 'Phòng thiết kế',           icon: '✏️' },
    marketing:     { label: 'Phòng Marketing',          icon: '📣' },
    hanh_chinh_kt: { label: 'Phòng hành chính kế toán', icon: '📊' },
    xuong:         { label: 'Xưởng nội thất',           icon: '🪚' },
    viewer:        { label: 'Chỉ xem',                  icon: '👁️' },
};

const pageTitles = {
    '/': 'Dashboard',
    '/sales': 'Dashboard Kinh Doanh',
    '/workshop': 'Dashboard Xưởng',
    '/customers': 'Khách hàng',
    '/projects': 'Dự án',
    '/products': 'Sản phẩm & VT',
    '/quotations': 'Báo giá',
    '/inventory': 'Kho & Tồn kho',
    '/finance': 'Tài chính',
    '/finance/kinh-doanh': 'Chi phí Kinh doanh',
    '/workshop/tasks': 'Công việc xưởng',
    '/workshop/workers': 'Nhân công xưởng',
    '/workshop/materials': 'Vật tư kho',
    '/workshop/timeline': 'Tiến độ Gantt',
    '/hr': 'Nhân sự',
    '/hr/accounts': 'Tài khoản hệ thống',
    '/reports': 'Báo cáo',
    '/pipeline': 'Pipeline',
    '/payments': 'Thu tiền',
    '/expenses': 'Chi phí',
    '/purchasing': 'Mua sắm VT',
    '/contracts': 'Hợp đồng',
    '/work-orders': 'Phiếu CV',
    '/partners': 'Đối tác',
    '/schedule-templates': 'Mẫu tiến độ',
};

export default function Header({ onMenuToggle }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, update } = useSession();
    const title = pageTitles[pathname] || 'HomeERP';
    const [dark, setDark] = useState(false);
    const [roleSwitching, setRoleSwitching] = useState(false);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const roleMenuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (roleMenuRef.current && !roleMenuRef.current.contains(e.target)) {
                setShowRoleMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitchRole = async (newRole) => {
        if (newRole === session?.user?.role) { setShowRoleMenu(false); return; }
        setRoleSwitching(true);
        setShowRoleMenu(false);
        try {
            await update({ switchToRole: newRole });
            router.push('/');
            router.refresh();
        } finally {
            setRoleSwitching(false);
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            setDark(true);
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const next = !dark;
        setDark(next);
        if (next) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    };

    const userName = session?.user?.name || 'User';
    const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const currentRole = session?.user?.role || '';
    const allowedRoles = session?.user?.allowedRoles || [];
    const canSwitch = allowedRoles.length > 0;
    const currentRoleInfo = ROLE_LABELS[currentRole];

    return (
        <header className="header">
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Mở menu">
                    <Menu size={22} />
                </button>
                <h2 className="header-title">{title}</h2>
                <div className="header-search">
                    <span className="search-icon"><Search size={16} /></span>
                    <input type="text" placeholder="Tìm kiếm..." aria-label="Tìm kiếm" />
                </div>
            </div>
            <div className="header-right">
                <button className="header-btn" title={dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'} onClick={toggleTheme} aria-label="Chuyển đổi giao diện">
                    {dark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button className="header-btn" title="Thông báo" aria-label="Thông báo">
                    <Bell size={20} />
                    <span className="badge-dot"></span>
                </button>
                <div className="header-user">
                    <div className="avatar">{initials}</div>
                    <div className="user-info">
                        <span className="user-name">{userName}</span>
                        {canSwitch ? (
                            <div ref={roleMenuRef} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowRoleMenu(v => !v)}
                                    disabled={roleSwitching}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        background: 'none', border: 'none', padding: 0,
                                        cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)',
                                        fontFamily: 'inherit',
                                    }}
                                    title="Đổi phòng ban"
                                >
                                    <span>{currentRoleInfo ? `${currentRoleInfo.icon} ${currentRoleInfo.label}` : currentRole}</span>
                                    <ChevronDown size={12} />
                                </button>
                                {showRoleMenu && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, zIndex: 1000,
                                        background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)',
                                        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                        minWidth: 200, marginTop: 4, overflow: 'hidden',
                                    }}>
                                        <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color, #e5e7eb)', fontWeight: 600 }}>
                                            Chuyển phòng ban
                                        </div>
                                        {allowedRoles.map(r => {
                                            const info = ROLE_LABELS[r];
                                            const isActive = r === currentRole;
                                            return (
                                                <button
                                                    key={r}
                                                    onClick={() => handleSwitchRole(r)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        width: '100%', padding: '10px 14px',
                                                        background: isActive ? 'var(--hover-bg, #f3f4f6)' : 'none',
                                                        border: 'none', cursor: 'pointer', fontSize: 13,
                                                        textAlign: 'left', color: 'var(--text-primary)',
                                                        fontFamily: 'inherit',
                                                    }}
                                                >
                                                    <span style={{ fontSize: 16 }}>{info?.icon || '●'}</span>
                                                    <span style={{ flex: 1 }}>{info?.label || r}</span>
                                                    {isActive && <span style={{ fontSize: 11, color: 'var(--color-primary, #3b82f6)', fontWeight: 600 }}>✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="user-role">{currentRoleInfo ? `${currentRoleInfo.icon} ${currentRoleInfo.label}` : currentRole}</span>
                        )}
                    </div>
                </div>
                <button
                    className="header-btn"
                    title="Đăng xuất"
                    aria-label="Đăng xuất"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
