'use client';
import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';

export const ROLES = [
    { key: 'giam_doc', label: 'Giám đốc', icon: '👑', color: '#c0392b' },
    { key: 'pho_gd', label: 'Phó Giám đốc', icon: '🏅', color: '#e67e22' },
    { key: 'ke_toan', label: 'Kế toán', icon: '📊', color: '#2980b9' },
    { key: 'ky_thuat', label: 'Kỹ thuật', icon: '🔧', color: '#27ae60' },
    { key: 'kinh_doanh', label: 'Kinh doanh', icon: '💼', color: '#8e44ad' },
];

const PERMISSIONS = {
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
    kinh_doanh: {
        canApprove: false, canReject: false, canCreateExpense: false,
        canPayExpense: false, canCompleteExpense: false, canDeleteExpense: false,
        canCollectPayment: false, canPrintReceipt: false, canViewFinance: false,
        canViewProjects: true, canViewAll: false,
        canManageContractors: false, canManageSuppliers: false,
        filterProject: null,
    },
};

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
    const { data: session } = useSession();
    const role = session?.user?.role || 'ky_thuat';
    const permissions = PERMISSIONS[role] || PERMISSIONS.ky_thuat;
    const roleInfo = ROLES.find(r => r.key === role) || ROLES[3];
    const isKinhDoanh = role === 'kinh_doanh';

    return (
        <RoleContext.Provider value={{ role, roleInfo, permissions, isKinhDoanh }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const ctx = useContext(RoleContext);
    if (!ctx) return { role: 'ky_thuat', roleInfo: ROLES[3], permissions: PERMISSIONS.ky_thuat };
    return ctx;
}

export { PERMISSIONS };
