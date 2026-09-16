'use client';
import { X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

/** Logo SCT — nét trắng trên nền cam thương hiệu. */
function SctMark() {
    return (
        <svg width="22" height="22" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
            <path d="M12 8 L12 40" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
            <path d="M12 24 L34 8" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 24 L34 40" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 16 L28 24" stroke="#FFD5B0" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M20 32 L28 24" stroke="#FFD5B0" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
    );
}

/**
 * Khối logo + tên công ty ở đầu sidebar.
 * Trên desktop có nút thu gọn; trên mobile có nút đóng drawer.
 */
export default function SidebarBrand({ name, sub, collapsed, onToggleCollapse, onClose }) {
    return (
        <div className="sidebar-brand">
            <span className="brand-icon"><SctMark /></span>

            <span className="brand-text">
                <span className="brand-name">{name}</span>
                {sub && <span className="brand-sub">{sub}</span>}
            </span>

            {onToggleCollapse && (
                <button
                    type="button"
                    className="sidebar-collapse-btn"
                    onClick={onToggleCollapse}
                    aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                    title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                >
                    {collapsed
                        ? <PanelLeftOpen size={15} aria-hidden="true" />
                        : <PanelLeftClose size={15} aria-hidden="true" />}
                </button>
            )}

            <button
                type="button"
                className="mobile-menu-btn"
                onClick={onClose}
                aria-label="Đóng menu"
                style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)' }}
            >
                <X size={20} aria-hidden="true" />
            </button>
        </div>
    );
}
