import prisma from '@/lib/prisma';
import { ADVANCE_CATEGORY_BY_TYPE } from '@/lib/employeeAdvance';

// Server-only (dùng prisma trực tiếp) — tách riêng khỏi lib/employeeAdvance.js (isomorphic,
// được app/finance/journal/advances/page.js — 'use client' — import) để không kéo Prisma Client
// vào bundle trình duyệt.

const ADVANCE_CATEGORY_NAMES = [...new Set(Object.values(ADVANCE_CATEGORY_BY_TYPE))];

function reverseAdvanceType(categoryName) {
    const entry = Object.entries(ADVANCE_CATEGORY_BY_TYPE).find(([, catName]) => catName === categoryName);
    return entry ? entry[0] : 'Khác';
}

/**
 * Phiếu Chi nhập TRỰC TIẾP trong Nhật ký Thu – Chi (không qua modal "Tạo tạm ứng") nhưng đúng
 * danh mục Tạm ứng + gắn đối tượng Nhân viên — coi như tạm ứng "mồ côi" (chưa có EmployeeAdvance
 * liên kết). Trả về đã gắn advanceType suy ra từ tên danh mục, để sổ Tạm ứng nhân viên và sổ chi
 * tiết từng nhân viên nhận diện được, không cần bắt buộc nhập qua modal.
 *
 * @param {{ employeeId?: string, advanceTypes?: string[] }} filter - advanceTypes: chỉ lấy các
 *   loại tạm ứng trong danh sách (vd ['Lương']); bỏ trống = lấy tất cả loại.
 */
export async function findOrphanAdvanceTransactions({ employeeId, advanceTypes } = {}) {
    const categoryNames = advanceTypes
        ? advanceTypes.map(t => ADVANCE_CATEGORY_BY_TYPE[t]).filter(Boolean)
        : ADVANCE_CATEGORY_NAMES;
    const categories = categoryNames.length
        ? await prisma.financeCategory.findMany({ where: { name: { in: categoryNames } }, select: { id: true, name: true } })
        : [];
    if (categories.length === 0) return [];
    const categoryNameById = Object.fromEntries(categories.map(c => [c.id, c.name]));

    const rows = await prisma.financeTransaction.findMany({
        where: {
            deletedAt: null,
            type: 'Chi',
            objectType: 'Nhân viên',
            objectId: { not: '' },
            categoryId: { in: categories.map(c => c.id) },
            advanceOf: null,
            ...(employeeId ? { objectId: employeeId } : {}),
        },
        select: {
            id: true, code: true, date: true, amount: true, content: true, categoryId: true,
            objectId: true, objectName: true, projectId: true,
            project: { select: { id: true, name: true, code: true } },
            attachments: true, status: true,
        },
        orderBy: { date: 'asc' },
    });

    return rows.map(t => ({
        employeeId: t.objectId,
        employeeName: t.objectName,
        date: t.date,
        amount: t.amount,
        advanceType: reverseAdvanceType(categoryNameById[t.categoryId]),
        content: t.content,
        code: t.code,
        project: t.project,
        financeTransactionId: t.id,
        financeTransactionCode: t.code,
        attachments: t.attachments || [],
        status: t.status,
        isDirectEntry: true,
        settlements: [], // chưa có EmployeeAdvance liên kết nên chưa có quyết toán — giữ shape khớp EmployeeAdvance để dùng chung computeBalance/flatMap
    }));
}
