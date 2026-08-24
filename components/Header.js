'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Sun, Moon, Bell, Settings, LogOut, Search, Menu, ChevronDown, HelpCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';

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
    '/finance/kinh-doanh': 'Chi phí Kinh doanh',
    '/workshop/tasks': 'Công việc xưởng',
    '/workshop/workers': 'Nhân công xưởng',
    '/workshop/materials': 'Vật tư kho',
    '/workshop/timeline': 'Tiến độ Gantt',
    '/design-orders/gantt': 'Gantt Thiết Kế',
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

function notifTimeAgo(d) {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(d).toLocaleDateString('vi-VN');
}

export default function Header({ onMenuToggle }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, update } = useSession();
    const title = pageTitles[pathname] || 'HomeERP';
    const [dark, setDark] = useState(false);
    const [roleSwitching, setRoleSwitching] = useState(false);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const roleMenuRef = useRef(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const notifMenuRef = useRef(null);
    const [showHelp, setShowHelp] = useState(false);

    const fetchNotifications = () => {
        fetch('/api/notifications').then(r => r.ok ? r.json() : null).then(d => {
            if (!d) return;
            setNotifications(d.notifications || []);
            setUnreadCount(d.unreadCount || 0);
        }).catch(() => {});
    };

    useEffect(() => {
        if (!session?.user?.id) return;
        fetchNotifications();
        const timer = setInterval(fetchNotifications, 60000);
        return () => clearInterval(timer);
    }, [session?.user?.id]);

    const openNotification = async (n) => {
        setShowNotifMenu(false);
        if (!n.read) {
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
            setUnreadCount(c => Math.max(0, c - 1));
            fetch(`/api/notifications/${n.id}`, { method: 'PUT' }).catch(() => {});
        }
        if (n.link) router.push(n.link);
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(x => ({ ...x, read: true })));
        setUnreadCount(0);
        fetch('/api/notifications', { method: 'PUT' }).catch(() => {});
    };

    const acknowledgeNotification = async (n, e) => {
        e.stopPropagation();
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, acknowledged: true, read: true } : x));
        if (!n.read) setUnreadCount(c => Math.max(0, c - 1));
        try {
            await fetch(`/api/notifications/${n.id}/acknowledge`, { method: 'POST' });
        } catch {}
    };

    useEffect(() => {
        function handleClickOutside(e) {
            if (roleMenuRef.current && !roleMenuRef.current.contains(e.target)) {
                setShowRoleMenu(false);
            }
            if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
                setShowNotifMenu(false);
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
                <button className="header-btn" title="Hướng dẫn sử dụng" aria-label="Hướng dẫn sử dụng" onClick={() => setShowHelp(true)}>
                    <HelpCircle size={20} />
                </button>
                <button className="header-btn" title={dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'} onClick={toggleTheme} aria-label="Chuyển đổi giao diện">
                    {dark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <div ref={notifMenuRef} style={{ position: 'relative' }}>
                    <button className="header-btn" title="Thông báo" aria-label="Thông báo" onClick={() => setShowNotifMenu(v => !v)}>
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="badge-dot"></span>}
                    </button>
                    {showNotifMenu && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, zIndex: 1000,
                            background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)',
                            borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            width: 340, marginTop: 8, overflow: 'hidden',
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)',
                                borderBottom: '1px solid var(--border-color, #e5e7eb)', fontWeight: 600,
                            }}>
                                <span>Thông báo</span>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary, #3b82f6)', fontSize: 11, fontWeight: 600, padding: 0 }}>
                                        Đánh dấu đã đọc hết
                                    </button>
                                )}
                            </div>
                            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                                {notifications.length === 0 && (
                                    <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                                        Chưa có thông báo nào
                                    </div>
                                )}
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => openNotification(n)}
                                        role="button"
                                        tabIndex={0}
                                        style={{
                                            display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                                            background: n.read ? 'none' : 'var(--hover-bg, #eff6ff)',
                                            border: 'none', borderBottom: '1px solid var(--border-color, #f3f4f6)',
                                            cursor: 'pointer', fontFamily: 'inherit',
                                        }}
                                    >
                                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>
                                            {n.type === 'ack' && '✅ '}{n.message}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notifTimeAgo(n.createdAt)}</span>
                                            {n.type === 'mention' && (
                                                n.acknowledged ? (
                                                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Đã xác nhận nhận việc</span>
                                                ) : (
                                                    <button
                                                        onClick={e => acknowledgeNotification(n, e)}
                                                        style={{
                                                            fontSize: 11, fontWeight: 600, color: '#fff', background: '#16a34a',
                                                            border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
                                                        }}
                                                    >
                                                        Xác nhận nhận việc
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
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
                                    <span className="role-switch-icon">{currentRoleInfo?.icon || '●'}</span>
                                    <span className="role-switch-label">{currentRoleInfo?.label || currentRole}</span>
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
                                        <div style={{ borderTop: '1px solid var(--border-color, #e5e7eb)', margin: '4px 0' }} />
                                        <button
                                            onClick={() => { setShowRoleMenu(false); router.push('/laocai/dashboard'); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                width: '100%', padding: '10px 14px',
                                                background: pathname.startsWith('/laocai') ? '#f0fdfa' : 'none',
                                                border: 'none', cursor: 'pointer', fontSize: 13,
                                                textAlign: 'left', color: '#0f766e',
                                                fontFamily: 'inherit', fontWeight: 600,
                                            }}
                                        >
                                            <span style={{ fontSize: 16 }}>🏪</span>
                                            <span style={{ flex: 1 }}>Chi nhánh Lào Cai</span>
                                            {pathname.startsWith('/laocai') && <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 700 }}>✓</span>}
                                        </button>
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

            <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Hướng dẫn sử dụng HomeERP" maxWidth={900}>
                <div style={{ width: '100%', height: '75vh' }}>
                    <iframe
                        src="https://duyhien12.github.io/homeerp-guide/"
                        title="Hướng dẫn sử dụng HomeERP"
                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                    />
                </div>
            </Modal>
        </header>
    );
}
