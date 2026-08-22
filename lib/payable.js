// Công nợ Nhà cung cấp — Số dư đầu kỳ nhập tay (Supplier.openingPayableBalance) trừ "Đã trả
// trong kỳ" tính từ FinanceTransaction (Nhật ký Thu – Chi, objectType='NCC'). Không dùng
// PurchaseOrder làm nguồn dữ liệu — chỉ lấy dữ liệu có trong Nhật ký, đúng yêu cầu.
export { ADMIN_ROLES, ACCOUNTANT_ROLES, VIEW_ROLES, CREATE_ROLES, deriveCashFields } from '@/lib/financeJournal';
