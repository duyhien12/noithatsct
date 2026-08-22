import { z } from 'zod';
import { optStr, optDate } from './common';

// Xác nhận thu 1 đợt thanh toán từ các trang cũ (/finance, /workshop/expenses, /sales/expenses —
// đã ẩn khỏi menu nhưng chưa xóa code) — luôn gắn đúng 1 ContractPayment lấy từ URL. "amount" ở
// đây là SỐ TIỀN LẦN THU NÀY (không phải paidAmount lũy kế) để tránh model cũ gửi nhầm tổng dồn.
export const receivableSinglePaySchema = z.object({
    amount: z.number({ error: 'Số tiền không hợp lệ' }).positive('Số tiền phải lớn hơn 0'),
    method: z.enum(['Tiền mặt', 'Chuyển khoản'], { error: 'Vui lòng chọn phương thức thu tiền' }),
    bankAccountId: z.string().optional().nullable().default(null),
    cashFundId: z.string().optional().nullable().default(null),
    proofUrl: optStr,
    notes: optStr,
    date: optDate,
}).strict()
    .refine(d => d.method !== 'Chuyển khoản' || !!d.bankAccountId, {
        message: 'Thu chuyển khoản bắt buộc chọn tài khoản ngân hàng', path: ['bankAccountId'],
    });
