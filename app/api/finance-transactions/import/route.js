import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { withCodeRetry } from '@/lib/generateCode';
import { CREATE_ROLES, DEPARTMENTS, TRANSACTION_TYPES, PAYMENT_METHODS, deriveCashFields } from '@/lib/financeJournal';

// Nhận mảng rows đã được parse từ Excel ở client (thư viện xlsx).
// Mỗi row dùng tên cột dễ đọc (khớp file mẫu do trang /finance/journal xuất ra).
export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (rows.length === 0) return NextResponse.json({ error: 'Không có dòng dữ liệu nào để nhập' }, { status: 400 });
    if (rows.length > 500) return NextResponse.json({ error: 'Tối đa 500 dòng mỗi lần import' }, { status: 400 });

    const [accounts, projects, banks, categories] = await Promise.all([
        prisma.accountingAccount.findMany({ select: { id: true, code: true } }),
        prisma.project.findMany({ select: { id: true, code: true } }),
        prisma.bankAccount.findMany({ select: { id: true, accountNumber: true } }),
        prisma.financeCategory.findMany({ select: { id: true, name: true } }),
    ]);
    const accountByCode = new Map(accounts.map(a => [a.code.trim(), a.id]));
    const projectByCode = new Map(projects.map(p => [p.code.trim(), p.id]));
    const bankByNumber = new Map(banks.map(b => [b.accountNumber.trim(), b.id]));
    const categoryByName = new Map(categories.map(c => [c.name.trim().toLowerCase(), c.id]));

    const results = { success: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNo = i + 2; // dòng 1 là header trong Excel
        try {
            const date = r['Ngày'] ? new Date(r['Ngày']) : null;
            if (!date || isNaN(date.getTime())) throw new Error('Ngày không hợp lệ');

            const type = String(r['Loại GD'] || '').trim();
            if (!TRANSACTION_TYPES.includes(type)) throw new Error('Loại GD phải là "Thu" hoặc "Chi"');

            const method = String(r['Phương thức'] || '').trim();
            if (!PAYMENT_METHODS.includes(method)) throw new Error('Phương thức phải là "Tiền mặt" hoặc "Chuyển khoản"');

            const amount = Number(r['Số tiền']);
            if (!amount || amount <= 0) throw new Error('Số tiền phải lớn hơn 0');

            const department = String(r['Phòng ban'] || '').trim();
            if (!DEPARTMENTS.includes(department)) throw new Error(`Phòng ban không hợp lệ (${DEPARTMENTS.join(', ')})`);

            const content = String(r['Nội dung'] || '').trim();
            if (!content) throw new Error('Nội dung bắt buộc');

            const debitCode = String(r['TK Nợ'] || '').trim();
            const creditCode = String(r['TK Có'] || '').trim();
            const debitAccountId = accountByCode.get(debitCode);
            const creditAccountId = accountByCode.get(creditCode);
            if (!debitAccountId) throw new Error(`Không tìm thấy TK Nợ "${debitCode}"`);
            if (!creditAccountId) throw new Error(`Không tìm thấy TK Có "${creditCode}"`);
            if (debitAccountId === creditAccountId) throw new Error('TK Nợ và TK Có không được trùng nhau');

            let bankAccountId = null;
            if (method === 'Chuyển khoản') {
                const bankNo = String(r['TK ngân hàng'] || '').trim();
                bankAccountId = bankByNumber.get(bankNo);
                if (!bankAccountId) throw new Error(`Chuyển khoản cần TK ngân hàng hợp lệ ("${bankNo}" không tìm thấy)`);
            }

            const projectCode = String(r['Dự án'] || '').trim();
            const projectId = projectCode ? (projectByCode.get(projectCode) || null) : null;

            const categoryName = String(r['Phân loại'] || '').trim();
            const categoryId = categoryName ? (categoryByName.get(categoryName.toLowerCase()) || null) : null;

            const documentNo = String(r['Số chứng từ'] || '').trim();
            const itemQty = Number(r['Số lượng']) || 0;
            const itemUnitPrice = Number(r['Đơn giá']) || 0;

            // Bỏ qua nếu đã tồn tại giao dịch cùng số chứng từ + ngày + số tiền
            if (documentNo) {
                const dup = await prisma.financeTransaction.findFirst({
                    where: { documentNo, date, amount, deletedAt: null },
                    select: { id: true },
                });
                if (dup) throw new Error(`Trùng số chứng từ "${documentNo}" (đã có giao dịch ${dup.id})`);
            }

            const cash = deriveCashFields(type, method, amount);
            const prefix = type === 'Thu' ? 'PT' : 'PC';
            await withCodeRetry('financeTransaction', prefix, (code) =>
                prisma.financeTransaction.create({
                    data: {
                        code,
                        date, type, method, amount,
                        ...cash,
                        department,
                        projectId,
                        content,
                        detail: String(r['Chi tiết'] || '').trim(),
                        debitAccountId,
                        creditAccountId,
                        bankAccountId,
                        categoryId,
                        objectType: String(r['Loại đối tượng'] || '').trim(),
                        objectName: String(r['Tên đối tượng'] || '').trim(),
                        payerReceiver: String(r['Người nhận/nộp'] || '').trim(),
                        itemName: String(r['Chủng loại'] || '').trim(),
                        itemUnit: String(r['ĐVT'] || '').trim(),
                        itemQty,
                        itemUnitPrice,
                        itemAmount: itemQty * itemUnitPrice,
                        documentNo,
                        documentDate: r['Ngày chứng từ'] ? new Date(r['Ngày chứng từ']) : null,
                        notes: String(r['Ghi chú'] || '').trim(),
                        status: 'Nháp',
                        createdBy: session.user.name,
                        createdById: session.user.id,
                        createdByRole: session.user.role,
                    },
                }), 5
            );
            results.success++;
        } catch (err) {
            results.errors.push({ row: rowNo, message: err.message || 'Lỗi không xác định' });
        }
    }

    return NextResponse.json(results);
}, { roles: CREATE_ROLES });
