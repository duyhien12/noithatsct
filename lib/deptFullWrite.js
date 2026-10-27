/**
 * Tài khoản được quyền ghi cấp quản lý (như Ban GĐ) trên mọi bảng của các phòng ban mình được vào
 * (role gốc + allowedRoles — JWT đã đảm bảo role hiện tại luôn thuộc tập này).
 * Không áp dụng cho duyệt chi / tài chính / xưởng / quản trị tài khoản.
 * Isomorphic: dùng cả ở API route lẫn client.
 */
export const DEPT_FULL_WRITE_EMAILS = ['buithang@kientrucsct.com'];

export function hasDeptFullWrite(user) {
    return DEPT_FULL_WRITE_EMAILS.includes(user?.email || '');
}

// Role dùng cho các hàm kiểm tra quyền ghi theo role: tài khoản toàn quyền ghi được coi như Ban GĐ
export function writeRoleOf(user) {
    return hasDeptFullWrite(user) ? 'ban_gd' : (user?.role || '');
}
