const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Danh mục mặc định cho module Nhật ký Thu – Chi — kế toán tự thêm/sửa được qua
// modal "Cài đặt danh mục" trong /finance/journal, không cần sửa code.
// Nhóm Thu/Chi chỉ mang tính hiển thị trong "Cài đặt danh mục" — dropdown "Chi tiết"
// khi tạo giao dịch hiển thị chung tất cả danh mục, không lọc theo Loại giao dịch.
const DEFAULT_CATEGORIES = [
    { name: 'Vay ngắn hạn', group: 'Thu', order: 1 },
    { name: 'Thu khác', group: 'Thu', order: 2 },
    { name: 'Tiền gửi ngân hàng', group: 'Thu', order: 3 },
    { name: 'Phải thu khách hàng', group: 'Thu', order: 4 },
    { name: 'Lãi TK', group: 'Thu', order: 5 },
    { name: 'Doanh thu KDNT', group: 'Thu', order: 6 },
    { name: 'Doanh Thu TKNT', group: 'Thu', order: 7 },
    { name: 'Doanh thu TKKT', group: 'Thu', order: 8 },
    { name: 'Doanh thu XD', group: 'Thu', order: 9 },
    { name: 'BHXH', group: 'Chi', order: 1 },
    { name: 'Công đoàn', group: 'Chi', order: 2 },
    { name: 'Đối ngoại', group: 'Chi', order: 3 },
    { name: 'Xe oto', group: 'Chi', order: 4 },
    { name: 'Phúc lợi', group: 'Chi', order: 5 },
    { name: 'CP chung', group: 'Chi', order: 6 },
    { name: 'Nước SH', group: 'Chi', order: 7 },
    { name: 'Điện thoại', group: 'Chi', order: 8 },
    { name: 'Internet', group: 'Chi', order: 9 },
    { name: 'Sửa chữa', group: 'Chi', order: 10 },
    { name: 'Chi riêng', group: 'Chi', order: 11 },
    { name: 'Công tác', group: 'Chi', order: 12 },
    { name: 'NC thuê ngoài', group: 'Chi', order: 13 },
    { name: 'Xăng xe', group: 'Chi', order: 14 },
    { name: 'Vận chuyển', group: 'Chi', order: 15 },
    { name: 'Quảng cáo', group: 'Chi', order: 16 },
    { name: 'Điện sáng', group: 'Chi', order: 17 },
    { name: 'Lương', group: 'Chi', order: 18 },
    { name: 'Tiền ăn', group: 'Chi', order: 19 },
    { name: 'Tiếp khách', group: 'Chi', order: 20 },
    { name: 'Phần mềm', group: 'Chi', order: 21 },
    { name: 'Vật tư', group: 'Chi', order: 22 },
    { name: 'Sửa chữa MM', group: 'Chi', order: 23 },
    { name: 'Máy móc', group: 'Chi', order: 24 },
    { name: 'Lãi', group: 'Chi', order: 25 },
    { name: 'Thuế', group: 'Chi', order: 26 },
    { name: 'T/ứng VT+ ăn+ c/tác', group: 'Chi', order: 27 },
    { name: 'Trả NCC', group: 'Chi', order: 28 },
    { name: 'Chi khác', group: 'Chi', order: 29 },
    { name: 'T/ứng lương', group: 'Chi', order: 30 },
    { name: 'Sửa xe', group: 'Chi', order: 31 },
    { name: 'In hồ sơ', group: 'Chi', order: 32 },
    { name: 'Công cụ dụng cụ', group: 'Chi', order: 33 },
    { name: 'Phụ cấp', group: 'Chi', order: 34 },
    { name: 'Ứng lương SP', group: 'Chi', order: 35 },
    { name: 'Hàng hóa', group: 'Chi', order: 36 },
    { name: 'Đồng phục', group: 'Chi', order: 37 },
    { name: 'Gửi HĐ', group: 'Chi', order: 38 },
    { name: 'Lương SP', group: 'Chi', order: 39 },
    { name: 'Cho vay nội bộ', group: 'Chi', order: 40 },
    { name: 'Thưởng năng suất', group: 'Chi', order: 41 },
    { name: 'Thuê nhà', group: 'Chi', order: 42 },
    { name: 'Tổ chức sự kiện', group: 'Chi', order: 43 },
    { name: 'Chi A', group: 'Chi', order: 44 },
    { name: 'Bảo dưỡng', group: 'Chi', order: 45 },
    { name: 'Thu phí TK', group: 'Chi', order: 46 },
    { name: 'Chuyển quỹ', group: 'Chi', order: 47 },
    { name: 'Quà tặng', group: 'Chi', order: 48 },
    { name: 'Chiết khấu', group: 'Chi', order: 49 },
    { name: 'Văn phòng phẩm', group: 'Chi', order: 50 },
    { name: 'Làm thêm giờ', group: 'Chi', order: 51 },
    { name: 'Chi phí công trình', group: 'Chi', order: 52 },
    { name: 'Gốc', group: 'Chi', order: 53 },
    { name: 'Đầu tư XNT', group: 'Chi', order: 54 },
    { name: 'Liên hoan', group: 'Chi', order: 55 },
    { name: 'Phí thẩm định', group: 'Chi', order: 56 },
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
        const r = await prisma.financeCategory.createMany({ data: DEFAULT_CATEGORIES });
        console.log(`✅ Seeded ${r.count} phân loại Thu/Chi.`);
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
