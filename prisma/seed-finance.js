const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Danh mục mặc định cho module Nhật ký Thu – Chi — kế toán tự thêm/sửa được qua
// modal "Cài đặt danh mục" trong /finance/journal, không cần sửa code.
const DEFAULT_CATEGORIES = [
    { name: 'Thu khách hàng', group: 'Thu', order: 1 },
    { name: 'Thu công nợ', group: 'Thu', order: 2 },
    { name: 'Thu tạm ứng hoàn lại', group: 'Thu', order: 3 },
    { name: 'Thu hoàn ứng', group: 'Thu', order: 4 },
    { name: 'Thu khác', group: 'Thu', order: 5 },
    { name: 'Mua vật tư', group: 'Chi', order: 1 },
    { name: 'Mua hàng hóa', group: 'Chi', order: 2 },
    { name: 'Chi nhà cung cấp', group: 'Chi', order: 3 },
    { name: 'Chi thầu phụ', group: 'Chi', order: 4 },
    { name: 'Chi nhân công', group: 'Chi', order: 5 },
    { name: 'Chi lương', group: 'Chi', order: 6 },
    { name: 'Chi vận chuyển', group: 'Chi', order: 7 },
    { name: 'Chi văn phòng', group: 'Chi', order: 8 },
    { name: 'Chi tiếp khách', group: 'Chi', order: 9 },
    { name: 'Chi marketing', group: 'Chi', order: 10 },
    { name: 'Chi công trình', group: 'Chi', order: 11 },
    { name: 'Chi xưởng', group: 'Chi', order: 12 },
    { name: 'Chi tạm ứng', group: 'Chi', order: 13 },
    { name: 'Chi hoàn ứng', group: 'Chi', order: 14 },
    { name: 'Chi phí cố định', group: 'Chi', order: 15 },
    { name: 'Chi khác', group: 'Chi', order: 16 },
];

const DEFAULT_ACCOUNTS = [
    { code: '111', name: 'Tiền mặt', order: 1 },
    { code: '112', name: 'Tiền gửi ngân hàng', order: 2 },
    { code: '131', name: 'Phải thu khách hàng', order: 3 },
    { code: '138', name: 'Phải thu khác', order: 4 },
    { code: '141', name: 'Tạm ứng', order: 5 },
    { code: '331', name: 'Phải trả người bán', order: 6 },
    { code: '334', name: 'Phải trả người lao động', order: 7 },
    { code: '338', name: 'Phải trả, phải nộp khác', order: 8 },
    { code: '511', name: 'Doanh thu', order: 9 },
    { code: '621', name: 'Chi phí nguyên vật liệu trực tiếp', order: 10 },
    { code: '622', name: 'Chi phí nhân công trực tiếp', order: 11 },
    { code: '627', name: 'Chi phí sản xuất chung', order: 12 },
    { code: '641', name: 'Chi phí bán hàng', order: 13 },
    { code: '642', name: 'Chi phí quản lý doanh nghiệp', order: 14 },
    { code: '811', name: 'Chi phí khác', order: 15 },
];

async function main() {
    const catCount = await prisma.financeCategory.count();
    if (catCount === 0) {
        const r = await prisma.financeCategory.createMany({ data: DEFAULT_CATEGORIES });
        console.log(`✅ Seeded ${r.count} phân loại Thu/Chi.`);
    } else {
        console.log(`⚠️  Đã có ${catCount} phân loại — bỏ qua seed FinanceCategory.`);
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
