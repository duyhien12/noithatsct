'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
    Sun, Moon, Bell, LogOut, Search, Menu, ChevronDown,
    HelpCircle, Check, Store, Repeat,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { initials as makeInitials, timeAgo } from '@/lib/format';

const ROLE_LABELS = {
    ban_gd:        { label: 'Ban giám đốc' },
    kinh_doanh:    { label: 'Phòng kinh doanh' },
    xay_dung:      { label: 'Phòng xây dựng' },
    thiet_ke:      { label: 'Phòng thiết kế' },
    marketing:     { label: 'Phòng Marketing' },
    hanh_chinh_kt: { label: 'Phòng hành chính kế toán' },
    xuong:         { label: 'Xưởng nội thất' },
    viewer:        { label: 'Chỉ xem' },
};

/** Tên trang theo đường dẫn — dùng cho tiêu đề header và breadcrumb. */
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

/** Tìm nhánh cha gần nhất để dựng breadcrumb đơn giản. */
function resolveTitles(pathname) {
    const exact = pageTitles[pathname];
    if (exact) return { title: exact, parent: pathname === '/' ? null : 'Trang chủ' };

    const segments = pathname.split('/').filter(Boolean);
    for (let i = segments.length - 1; i > 0; i--) {
        const candidate = `/${segments.slice(0, i).join('/')}`;
        if (pageTitles[candidate]) {
            return { title: pageTitles[candidate], parent: 'Trang chủ' };
        }
    }
    return { title: 'HomeERP', parent: null };
}

export default function Header({ onMenuToggle }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, update } = useSession();
    const { title, parent } = resolveTitles(pathname);

    const [dark, setDark] = useState(false);
    const [roleSwitching, setRoleSwitching] = useState(false);
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const accountRef = useRef(null);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const notifMenuRef = useRef(null);

    const [showHelp, setShowHelp] = useState(false);
    const [helpCacheBust, setHelpCacheBust] = useState(0);

    const fetchNotifications = useCallback(() => {
        fetch('/api/notifications').then(r => r.ok ? r.json() : null).then(d => {
            if (!d) return;
            setNotifications(d.notifications || []);
            setUnreadCount(d.unreadCount || 0);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (!session?.user?.id) return undefined;
        fetchNotifications();
        const timer = setInterval(fetchNotifications, 60000);
        return () => clearInterval(timer);
    }, [session?.user?.id, fetchNotifications]);

    const openNotification = (n) => {
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
        } catch { /* bỏ qua */ }
    };

    // Đóng dropdown khi bấm ra ngoài hoặc nhấn Escape
    useEffect(() => {
        function handleClickOutside(e) {
            if (accountRef.current && !accountRef.current.contains(e.target)) setShowAccountMenu(false);
            if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) setShowNotifMenu(false);
        }
        function handleEscape(e) {
            if (e.key !== 'Escape') return;
            setShowAccountMenu(false);
            setShowNotifMenu(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleSwitchRole = async (newRole) => {
        if (newRole === session?.user?.role) { setShowAccountMenu(false); return; }
        setRoleSwitching(true);
        setShowAccountMenu(false);
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

    const userName = session?.user?.name || 'Người dùng';
    const initials = makeInitials(userName);
    const currentRole = session?.user?.role || '';
    const allowedRoles = session?.user?.allowedRoles || [];
    const canSwitch = allowedRoles.length > 0;
    const currentRoleLabel = ROLE_LABELS[currentRole]?.label || currentRole;

    return (
        <header className="header">
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Mở menu điều hướng">
                    <Menu size={22} aria-hidden="true" />
                </button>

                <div style={{ minWidth: 0 }}>
                    {parent && <div className="header-crumb">{parent}</div>}
                    {/* Không dùng <h1> ở đây: mỗi trang đã có <h1> riêng trong PageHeader */}
                    <div className="header-title">{title}</div>
                </div>

                <div className="header-search">
                    <span className="search-icon" aria-hidden="true"><Search size={15} /></span>
                    <input type="search" placeholder="Tìm kiếm toàn hệ thống..." aria-label="Tìm kiếm toàn hệ thống" />
                </div>
            </div>

            <div className="header-right">
                <button
                    className="header-btn"
                    title="Hướng dẫn sử dụng"
                    aria-label="Hướng dẫn sử dụng"
                    onClick={() => { setHelpCacheBust(Date.now()); setShowHelp(true); }}
                >
                    <HelpCircle size={19} aria-hidden="true" />
                </button>

                <button
                    className="header-btn"
                    title={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
                    aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
                    onClick={toggleTheme}
                >
                    {dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
                </button>

                <div ref={notifMenuRef} style={{ position: 'relative' }}>
                    <button
                        className="header-btn"
                        title="Thông báo"
                        aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
                        aria-haspopup="menu"
                        aria-expanded={showNotifMenu}
                        onClick={() => setShowNotifMenu(v => !v)}
                    >
                        <Bell size={19} aria-hidden="true" />
                        {unreadCount > 0 && <span className="badge-dot" />}
                    </button>

                    {showNotifMenu && (
                        <div className="header-pop" style={{ width: 340 }}>
                            <div className="header-pop__head">
                                <span>Thông báo</span>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={markAllRead}
                                        className="ui-btn ui-btn--ghost ui-btn--sm"
                                        style={{ color: 'var(--color-primary-700)' }}
                                    >
                                        Đánh dấu đã đọc hết
                                    </button>
                                )}
                            </div>
                            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                                {notifications.length === 0 && (
                                    <p className="ui-caption" style={{ padding: '24px 14px', textAlign: 'center' }}>
                                        Chưa có thông báo nào
                                    </p>
                                )}
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => openNotification(n)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') openNotification(n); }}
                                        role="button"
                                        tabIndex={0}
                                        style={{
                                            padding: '10px 14px',
                                            background: n.read ? 'transparent' : 'var(--color-primary-50)',
                                            borderBottom: '1px solid var(--color-border-subtle)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{
                                            fontSize: 13,
                                            color: 'var(--color-text)',
                                            fontWeight: n.read ? 400 : 600,
                                            lineHeight: 1.45,
                                        }}>
                                            {n.message}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                            <span className="ui-caption">{timeAgo(n.createdAt)}</span>
                                            {n.type === 'mention' && (
                                                n.acknowledged ? (
                                                    <span className="ui-badge ui-badge--success ui-badge--sm">Đã xác nhận nhận việc</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="ui-btn ui-btn--primary ui-btn--sm"
                                                        onClick={e => acknowledgeNotification(n, e)}
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

                <div ref={accountRef} style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className="header-user"
                        onClick={() => setShowAccountMenu(v => !v)}
                        aria-haspopup="menu"
                        aria-expanded={showAccountMenu}
                        aria-label="Menu tài khoản"
                        disabled={roleSwitching}
                    >
                        <span className="avatar" aria-hidden="true">{initials}</span>
                        <span className="user-info">
                            <span className="user-name">{userName}</span>
                            <span className="user-role">{currentRoleLabel}</span>
                        </span>
                        <ChevronDown size={14} aria-hidden="true" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    </button>

                    {showAccountMenu && (
                        <div className="header-pop" style={{ minWidth: 248 }} role="menu">
                            <div className="header-pop__head" style={{ display: 'block' }}>
                                <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{userName}</div>
                                <div style={{ fontWeight: 400, marginTop: 2 }}>{session?.user?.email}</div>
                            </div>

                            {canSwitch && (
                                <>
                                    <div className="header-pop__head" style={{ borderTop: 'none' }}>
                                        <span><Repeat size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Chuyển phòng ban</span>
                                    </div>
                                    {allowedRoles.map(r => {
                                        const isActive = r === currentRole;
                                        return (
                                            <button
                                                key={r}
                                                type="button"
                                                role="menuitem"
                                                className="header-pop__item"
                                                onClick={() => handleSwitchRole(r)}
                                                style={isActive ? { background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', fontWeight: 600 } : undefined}
                                            >
                                                <span style={{ flex: 1 }}>{ROLE_LABELS[r]?.label || r}</span>
                                                {isActive && <Check size={15} aria-hidden="true" />}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="header-pop__item"
                                        onClick={() => { setShowAccountMenu(false); router.push('/laocai/dashboard'); }}
                                    >
                                        <Store size={15} aria-hidden="true" />
                                        <span style={{ flex: 1 }}>Chi nhánh Lào Cai</span>
                                        {pathname.startsWith('/laocai') && <Check size={15} aria-hidden="true" />}
                                    </button>
                                </>
                            )}

                            <div className="header-pop__sep" />
                            <button
                                type="button"
                                role="menuitem"
                                className="header-pop__item header-pop__item--danger"
                                onClick={() => signOut({ callbackUrl: '/login' })}
                            >
                                <LogOut size={15} aria-hidden="true" />
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Hướng dẫn sử dụng HomeERP" maxWidth={900}>
                <div style={{ width: '100%', height: '70vh' }}>
                    <iframe
                        src={`https://duyhien12.github.io/homeerp-guide/?v=${helpCacheBust}`}
                        title="Hướng dẫn sử dụng HomeERP"
                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--radius)' }}
                    />
                </div>
            </Modal>
        </header>
    );
}
