'use client';
import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

export const ROLES = [
    { key: 'ban_gd',        label: 'Ban giám đốc',              icon: '👑', color: '#c0392b' },
    { key: 'kinh_doanh',    label: 'Phòng kinh doanh',          icon: '💼', color: '#8e44ad' },
    { key: 'xay_dung',      label: 'Phòng xây dựng',            icon: '🏗️', color: '#2980b9' },
    { key: 'thiet_ke',      label: 'Phòng thiết kế',            icon: '✏️', color: '#16a085' },
    { key: 'marketing',     label: 'Phòng Marketing',           icon: '📣', color: '#e91e63' },
    { key: 'hanh_chinh_kt', label: 'Phòng hành chính kế toán',  icon: '📊', color: '#f39c12' },
    { key: 'xuong',         label: 'Xưởng nội thất',            icon: '🪚', color: '#d35400' },
    { key: 'viewer',        label: 'Chỉ xem',                   icon: '👁️', color: '#6b7280' },
];

const PERMISSIONS = {
    // ── Roles mới ───────────────────────────────────────────────────────────
    ban_gd: {
        canApprove: true, canReject: true, canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: true, canDeleteExpense: true,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: true, canManageSuppliers: true,
        filterProject: null,
    },
    kinh_doanh: {
        canApprove: false, canReject: false, canCreateExpense: true,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
    xay_dung: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
    thiet_ke: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
    marketing: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: false, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
    hanh_chinh_kt: {
        canApprove: false, canReject: false, canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: false, canManageSuppliers: true,
        filterProject: null,
    },
    xuong: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },

    // ── Roles cũ — giữ để backward compat với tài khoản cũ trong DB ─────────
    giam_doc: {
        canApprove: true, canReject: true, canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: true, canDeleteExpense: true,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: true, canManageSuppliers: true,
        filterProject: null,
    },
    pho_gd: {
        canApprove: true, canReject: true, canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: true, canDeleteExpense: false,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: true, canManageSuppliers: true,
        filterProject: null,
    },
    ke_toan: {
        canApprove: false, canReject: false, canCreateExpense: true,
        canPayExpense: true, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: true, canPrintReceipt: true, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: false, canManageSuppliers: true,
        filterProject: null,
    },
    ky_thuat: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
    viewer: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: true,
        canViewProjects: true, canViewAll: true,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
};

const RoleContext = createContext(null);

// Roles được xem full dashboard
const DASHBOARD_ROLES = ['ban_gd', 'giam_doc', 'pho_gd', 'viewer'];
const ADMIN_EMAIL = 'admin@kientrucsct.com';

export function RoleProvider({ children }) {
    const { data: session } = useSession();
    const role = session?.user?.role || 'xay_dung';
    const email = session?.user?.email || '';
    const department = session?.user?.department || '';
    const permissions = PERMISSIONS[role] || PERMISSIONS.xay_dung;
    const roleInfo = ROLES.find(r => r.key === role)
        // fallback cho roles cũ còn trong DB
        || { key: role, label: role, icon: '👤', color: '#6b7280' };
    const isKinhDoanh = role === 'kinh_doanh';
    const isXuong = role === 'xuong';
    const isViewer = role === 'viewer';
    const canViewDashboard = DASHBOARD_ROLES.includes(role) || email === ADMIN_EMAIL;
    // Nhân viên / Thợ xưởng: chỉ xem công việc, nhân công, tiến độ
    const isXuongNhanVien = role === 'xuong' && ['Nhân viên', 'Thợ chính', 'Thợ phụ'].includes(department);

    return (
        <RoleContext.Provider value={{ role, email, department, roleInfo, permissions, isKinhDoanh, isXuong, isXuongNhanVien, isViewer, canViewDashboard }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const ctx = useContext(RoleContext);
    if (!ctx) return {
        role: 'xay_dung', email: '', permissions: PERMISSIONS.xay_dung,
        roleInfo: ROLES[2], isKinhDoanh: false, isXuong: false, canViewDashboard: false,
    };
    return ctx;
}

export { PERMISSIONS };
