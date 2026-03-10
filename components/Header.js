'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Sun, Moon, Bell, Settings, LogOut, Search, Menu } from 'lucide-react';

const pageTitles = {
    '/': 'Dashboard',
    '/customers': 'Khách hàng',
    '/projects': 'Dự án',
    '/products': 'Sản phẩm & VT',
    '/quotations': 'Báo giá',
    '/inventory': 'Kho & Tồn kho',
    '/finance': 'Tài chính',
    '/hr': 'Nhân sự',
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
    const { data: session } = useSession();
    const title = pageTitles[pathname] || 'HomeERP';
    const [dark, setDark] = useState(false);

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
                        <span className="user-role">{session?.user?.role || ''}</span>
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
