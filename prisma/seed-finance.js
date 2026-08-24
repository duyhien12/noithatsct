const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Danh mục mặc định cho module Nhật ký Thu – Chi — kế toán tự thêm/sửa được qua
// modal "Cài đặt danh mục" trong /finance/journal, không cần sửa code.
// Cây 2 cấp: nhóm cấp 1 (định hướng báo cáo quản trị) → cấp 2 (danh mục chi tiết cũ).
// Cấp 3 (vd loại vật tư cụ thể) kế toán tự thêm khi cần. Bản sao ESM của cấu trúc này
// (dùng cho UI/API) nằm ở lib/financeJournal.js — DEFAULT_CATEGORY_GROUPS. Giữ 2 bản vì
// script này chạy bằng `node` thuần (CommonJS), không qua bước build/transpile của Next.js.
const DEFAULT_CATEGORY_GROUPS = [
    { name: 'Thu khách hàng / Doanh thu', group: 'Thu', order: 1, items: ['Doanh thu KDNT', 'Doanh Thu TKNT', 'Doanh thu TKKT', 'Doanh thu XD', 'Phải thu khách hàng'] },
    { name: 'Thu tài chính', group: 'Thu', order: 2, items: ['Vay ngắn hạn', 'Lãi TK', 'Tiền gửi ngân hàng'] },
    { name: 'Thu khác', group: 'Thu', order: 3, items: [] },

    { name: 'Chi phí công trình', group: 'Chi', order: 1, items: ['Vật tư', 'NC thuê ngoài', 'Vận chuyển', 'Máy móc', 'Sửa chữa MM', 'Công cụ dụng cụ', 'Hàng hóa', 'Chi phí công trình khác', 'Đầu tư XNT'] },
    { name: 'Chi phí nhân sự', group: 'Chi', order: 2, items: ['Lương', 'Lương SP', 'Ứng lương SP', 'T/ứng lương', 'BHXH', 'Công đoàn', 'Phụ cấp', 'Thưởng năng suất', 'Làm thêm giờ', 'Tiền ăn', 'Đồng phục', 'Phúc lợi'] },
    { name: 'Chi phí quản lý & vận hành', group: 'Chi', order: 3, items: ['CP chung', 'Nước SH', 'Điện thoại', 'Internet', 'Điện sáng', 'Văn phòng phẩm', 'In hồ sơ', 'Thuê nhà', 'Bảo dưỡng', 'Phần mềm', 'Sửa chữa'] },
    { name: 'Chi phí bán hàng & marketing', group: 'Chi', order: 4, items: ['Quảng cáo', 'Đối ngoại', 'Tiếp khách', 'Tổ chức sự kiện', 'Quà tặng', 'Chiết khấu', 'Gửi HĐ'] },
    { name: 'Chi phí đi lại & xe', group: 'Chi', order: 5, items: ['Xe oto', 'Xăng xe', 'Sửa xe', 'Công tác'] },
    { name: 'Chi phí tài chính', group: 'Chi', order: 6, items: ['Lãi', 'Gốc', 'Thuế', 'Thu phí TK', 'Phí thẩm định'] },
    { name: 'Tạm ứng & công nợ nội bộ', group: 'Chi', order: 7, items: ['Tạm ứng công tác', 'Tạm ứng vật tư', 'Tạm ứng ăn', 'Trả NCC', 'Cho vay nội bộ', 'Chuyển quỹ'] },
    { name: 'Chi khác', group: 'Chi', order: 8, items: ['Chi khác (chưa phân loại)', 'Chi riêng', 'Chi A', 'Liên hoan'] },
];

const DEFAULT_BANK_ACCOUNTS = [
    { bankName: 'Ngân hàng Thương mại Cổ phần Công Thương Việt Nam - VTB' },
    { bankName: 'Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam - VCB' },
    { bankName: 'Ngân hàng Thương mại Cổ phần Đầu tư và Phát triển Việt Nam - BIDV' },
    { bankName: 'Ngân hàng Thương mại Cổ phần Bắc Á - BAB' },
    { bankName: 'Ngân hàng Thương mại Cổ phần Quân Đội - MB' },
];

const DEFAULT_ACCOUNTS = [
    { code: '111', name: 'Tiền mặt', order: 1 },
    { code: '111.1', name: 'Quỹ TM Lan', order: 2 },
    { code: '111.2', name: 'Quỹ TM Quỳnh', order: 3 },
    { code: '112', name: 'Tiền gửi ngân hàng', order: 4 },
    { code: '131', name: 'Phải thu khách hàng', order: 5 },
    { code: '138', name: 'Phải thu khác', order: 6 },
    { code: '141', name: 'Tạm ứng', order: 7 },
    { code: '331', name: 'Phải trả người bán', order: 8 },
    { code: '334', name: 'Phải trả người lao động', order: 9 },
    { code: '338', name: 'Phải trả, phải nộp khác', order: 10 },
    { code: '511', name: 'Doanh thu', order: 11 },
    { code: '621', name: 'Chi phí nguyên vật liệu trực tiếp', order: 12 },
    { code: '622', name: 'Chi phí nhân công trực tiếp', order: 13 },
    { code: '627', name: 'Chi phí sản xuất chung', order: 14 },
    { code: '641', name: 'Chi phí bán hàng', order: 15 },
    { code: '642', name: 'Chi phí quản lý doanh nghiệp', order: 16 },
    { code: '811', name: 'Chi phí khác', order: 17 },
];

async function main() {
    const catCount = await prisma.financeCategory.count();
    if (catCount === 0) {
        let created = 0;
        for (const grp of DEFAULT_CATEGORY_GROUPS) {
            const parent = await prisma.financeCategory.create({
                data: { name: grp.name, group: grp.group, order: grp.order, level: 1 },
            });
            created++;
            for (let i = 0; i < grp.items.length; i++) {
                await prisma.financeCategory.create({
                    data: { name: grp.items[i], group: grp.group, order: i + 1, level: 2, parentId: parent.id },
                });
                created++;
            }
        }
        console.log(`✅ Seeded ${created} phân loại Thu/Chi (${DEFAULT_CATEGORY_GROUPS.length} nhóm cấp 1).`);
    } else {
        console.log(`⚠️  Đã có ${catCount} phân loại — bỏ qua seed FinanceCategory.`);
    }

    const bankCount = await prisma.bankAccount.count();
    if (bankCount === 0) {
        const r = await prisma.bankAccount.createMany({ data: DEFAULT_BANK_ACCOUNTS });
        console.log(`✅ Seeded ${r.count} tài khoản ngân hàng.`);
    } else {
        console.log(`⚠️  Đã có ${bankCount} tài khoản ngân hàng — bỏ qua seed BankAccount.`);
    }

    const accCount = await prisma.accountingAccount.count();
    if (accCount === 0) {
        const r = await prisma.accountingAccount.createMany({ data: DEFAULT_ACCOUNTS });
        console.log(`✅ Seeded ${r.count} tài khoản kế toán (Nợ/Có).`);
    } else {
        console.log(`⚠️  Đã có ${accCount} tài khoản kế toán — bỏ qua seed AccountingAccount.`);
    }
}

module.exports = main;

// Cho phép chạy độc lập: node prisma/seed-finance.js
if (require.main === module) {
    main()
        .catch(console.error)
        .finally(() => prisma.$disconnect());
}
