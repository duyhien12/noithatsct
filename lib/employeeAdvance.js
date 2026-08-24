// Sổ Tạm ứng & Hoàn ứng nhân viên — sổ con liên kết Nhật ký Thu – Chi (FinanceTransaction).
// Nguyên tắc: EmployeeAdvance luôn đi kèm đúng 1 FinanceTransaction (Chi) gốc; AdvanceSettlement
// chỉ tạo FinanceTransaction (Thu) khi settleType = cash_return — quyết toán bằng chứng từ / khấu
// trừ lương KHÔNG được phép tạo dòng tiền giả.

export const ADVANCE_TYPES = ['Lương', 'Công tác', 'Vật tư', 'Tiền ăn', 'Công trình', 'Chi phí', 'Khác'];

// Sổ con "Tạm ứng công tác/vật tư/tiền ăn" — lọc theo các loại tạm ứng phát sinh hoạt động
// (khác với tạm ứng Lương/Công trình/Chi phí/Khác), dùng chung dữ liệu EmployeeAdvance.
export const OPERATIONAL_ADVANCE_TYPES = ['Công tác', 'Vật tư', 'Tiền ăn'];

// Danh mục (FinanceCategory) tương ứng trong Nhật ký Thu – Chi — dùng để: (1) tự gắn categoryId khi
// tạo tạm ứng qua modal, và (2) nhận diện các phiếu Chi nhập TRỰC TIẾP trong Nhật ký (không qua modal
// "Tạo tạm ứng") vẫn hiện đúng trong sổ con tạm ứng. Khớp tên với seed prisma/seed-finance.js.
export const ADVANCE_CATEGORY_BY_TYPE = {
    'Lương': 'T/ứng lương',
    'Công tác': 'Tạm ứng công tác',
    'Vật tư': 'Tạm ứng vật tư',
    'Tiền ăn': 'Tạm ứng ăn',
};
export const DEFAULT_ADVANCE_CATEGORY = 'Tạm ứng công tác'; // fallback cho Công trình | Chi phí | Khác

export const SETTLE_TYPES = [
    { value: 'cash_return', label: 'Hoàn tiền mặt/CK', reducesCash: true },
    { value: 'expense_proof', label: 'Quyết toán bằng chứng từ chi phí', reducesCash: false },
    { value: 'salary_deduction', label: 'Khấu trừ lương', reducesCash: false },
];

export const SETTLE_TYPE_LABELS = Object.fromEntries(SETTLE_TYPES.map(s => [s.value, s.label]));

// Phòng Hành chính kế toán / Ban Giám đốc: toàn quyền. Tái dùng đúng phân quyền của Nhật ký Thu – Chi.
export { ADMIN_ROLES, ACCOUNTANT_ROLES, VIEW_ROLES, CREATE_ROLES } from '@/lib/financeJournal';

// Số dư tạm ứng = Đầu kỳ + Phát sinh tạm ứng - Đã hoàn ứng (cash_return + expense_proof) - Khấu trừ lương.
// list: mảng các { type: 'advance'|'settlement', date, amount, settleType? } đã sort theo ngày tăng dần.
export function computeBalance(openingBalance, advances, settlements) {
    const totalAdvance = advances.reduce((s, a) => s + a.amount, 0);
    const totalReturned = settlements.filter(s => s.settleType !== 'salary_deduction').reduce((s, x) => s + x.amount, 0);
    const totalDeducted = settlements.filter(s => s.settleType === 'salary_deduction').reduce((s, x) => s + x.amount, 0);
    return {
        openingBalance,
        totalAdvance,
        totalReturned,
        totalDeducted,
        closingBalance: openingBalance + totalAdvance - totalReturned - totalDeducted,
    };
}
