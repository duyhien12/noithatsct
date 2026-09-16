'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronUp, Undo2, Store, Check } from 'lucide-react';
import { ROLES } from '@/contexts/RoleContext';

/**
 * Khu vực tài khoản / vai trò — luôn nằm cuối sidebar.
 * Chỉ chuẩn hóa giao diện; logic phân quyền và danh sách vai trò giữ nguyên.
 */
export default function SidebarRoleFooter({
    roleInfo,
    role,
    actualRole,
    canSwitchRole,
    viewAsRole,
    setViewAsRole,
    deptViews = [],
    showLaoCai = false,
}) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const realRole = ROLES.find(r => r.key === actualRole);

    return (
        <div className="sidebar-footer">
            <div className="sidebar-footer__label">
                <Shield size={12} aria-hidden="true" />
                Vai trò
            </div>

            <button
                type="button"
                className="sidebar-role"
                onClick={canSwitchRole ? () => setOpen(v => !v) : undefined}
                aria-expanded={canSwitchRole ? open : undefined}
                aria-haspopup={canSwitchRole ? 'menu' : undefined}
                disabled={!canSwitchRole}
                title={roleInfo?.label}
            >
                <span className="sidebar-role__name">{roleInfo?.label}</span>
                {canSwitchRole && (
                    <ChevronUp
                        size={13}
                        aria-hidden="true"
                        style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none' }}
                    />
                )}
            </button>

            {canSwitchRole && open && (
                <div className="sidebar-role-menu" role="menu">
                    {viewAsRole && (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setViewAsRole(null); setOpen(false); }}
                        >
                            <Undo2 size={13} aria-hidden="true" />
                            <span style={{ flex: 1 }}>Về vai trò thật ({realRole?.label || actualRole})</span>
                        </button>
                    )}

                    {deptViews.map(d => {
                        const active = role === d.key;
                        return (
                            <button
                                key={d.key}
                                type="button"
                                role="menuitem"
                                className={active ? 'is-active' : undefined}
                                onClick={() => { setViewAsRole(d.key); setOpen(false); }}
                            >
                                <span style={{ flex: 1 }}>{d.label}</span>
                                {active && <Check size={13} aria-hidden="true" />}
                            </button>
                        );
                    })}

                    {showLaoCai && (
                        <>
                            <span className="sidebar-role-sep" />
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setOpen(false); router.push('/laocai/dashboard'); }}
                            >
                                <Store size={13} aria-hidden="true" />
                                <span style={{ flex: 1 }}>Chi nhánh Lào Cai</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
