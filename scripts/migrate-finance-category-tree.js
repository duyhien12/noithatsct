// Tổ chức lại FinanceCategory từ danh sách phẳng (65 mục Thu/Chi seed ngày 20/08/2026)
// thành cây 2 cấp: Nhóm cấp 1 (mới) -> danh mục chi tiết hiện có (giữ nguyên id, thành cấp 2).
// Không xóa/đổi tên danh mục cũ nên các FinanceTransaction.categoryId hiện có vẫn hợp lệ.
// An toàn để chạy lại nhiều lần (bỏ qua nhóm/mục đã gắn parentId).
// Run: node scripts/migrate-finance-category-tree.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Phải khớp DEFAULT_CATEGORY_GROUPS ở lib/financeJournal.js và prisma/seed-finance.js
const CATEGORY_GROUPS = [
    { name: 'Thu khách hàng / Doanh thu', group: 'Thu', order: 1, items: ['Doanh thu KDNT', 'Doanh Thu TKNT', 'Doanh thu TKKT', 'Doanh thu XD', 'Phải thu khách hàng'] },
    { name: 'Thu tài chính', group: 'Thu', order: 2, items: ['Vay ngắn hạn', 'Lãi TK', 'Tiền gửi ngân hàng'] },
    { name: 'Thu khác', group: 'Thu', order: 3, items: [] },

    { name: 'Chi phí công trình', group: 'Chi', order: 1, items: ['Vật tư', 'NC thuê ngoài', 'Vận chuyển', 'Máy móc', 'Sửa chữa MM', 'Công cụ dụng cụ', 'Hàng hóa', 'Chi phí công trình khác', 'Đầu tư XNT'] },
    { name: 'Chi phí nhân sự', group: 'Chi', order: 2, items: ['Lương', 'Lương SP', 'Ứng lương SP', 'T/ứng lương', 'BHXH', 'Công đoàn', 'Phụ cấp', 'Thưởng năng suất', 'Làm thêm giờ', 'Tiền ăn', 'Đồng phục', 'Phúc lợi'] },
    { name: 'Chi phí quản lý & vận hành', group: 'Chi', order: 3, items: ['CP chung', 'Nước SH', 'Điện thoại', 'Internet', 'Điện sáng', 'Văn phòng phẩm', 'In hồ sơ', 'Thuê nhà', 'Bảo dưỡng', 'Phần mềm', 'Sửa chữa'] },
    { name: 'Chi phí bán hàng & marketing', group: 'Chi', order: 4, items: ['Quảng cáo', 'Đối ngoại', 'Tiếp khách', 'Tổ chức sự kiện', 'Quà tặng', 'Chiết khấu', 'Gửi HĐ'] },
    { name: 'Chi phí đi lại & xe', group: 'Chi', order: 5, items: ['Xe oto', 'Xăng xe', 'Sửa xe', 'Công tác'] },
    { name: 'Chi phí tài chính', group: 'Chi', order: 6, items: ['Lãi', 'Gốc', 'Thuế', 'Thu phí TK', 'Phí thẩm định'] },
    { name: 'Tạm ứng & công nợ nội bộ', group: 'Chi', order: 7, items: ['T/ứng VT+ ăn+ c/tác', 'Trả NCC', 'Cho vay nội bộ', 'Chuyển quỹ'] },
    { name: 'Chi khác', group: 'Chi', order: 8, items: ['Chi khác (chưa phân loại)', 'Chi riêng', 'Chi A', 'Liên hoan'] },
];

async function main() {
    const existing = await prisma.financeCategory.findMany();
    const byNameGroup = new Map(existing.map(c => [`${c.group}::${c.name.trim().toLowerCase()}`, c]));

    let groupsCreated = 0, itemsLinked = 0, itemsCreated = 0, skipped = 0;

    for (const grp of CATEGORY_GROUPS) {
        let parent = byNameGroup.get(`${grp.group}::${grp.name.trim().toLowerCase()}`);
        if (!parent) {
            parent = await prisma.financeCategory.create({
                data: { name: grp.name, group: grp.group, order: grp.order, level: 1 },
            });
            byNameGroup.set(`${grp.group}::${grp.name.trim().toLowerCase()}`, parent);
            groupsCreated++;
            console.log(`+ Tạo nhóm cấp 1: [${grp.group}] ${grp.name}`);
        }

        for (let i = 0; i < grp.items.length; i++) {
            const itemName = grp.items[i];
            const key = `${grp.group}::${itemName.trim().toLowerCase()}`;
            const existingItem = byNameGroup.get(key);
            if (existingItem) {
                if (existingItem.parentId === parent.id && existingItem.level === 2) { skipped++; continue; }
                await prisma.financeCategory.update({
                    where: { id: existingItem.id },
                    data: { parentId: parent.id, level: 2, order: i + 1 },
                });
                itemsLinked++;
            } else {
                await prisma.financeCategory.create({
                    data: { name: itemName, group: grp.group, order: i + 1, level: 2, parentId: parent.id },
                });
                itemsCreated++;
                console.log(`  + Tạo mục thiếu: [${grp.group}] ${itemName} (dưới "${grp.name}")`);
            }
        }
    }

    console.log(`\n✅ Xong. Nhóm cấp 1 mới: ${groupsCreated}. Mục gắn vào cây: ${itemsLinked}. Mục tạo mới: ${itemsCreated}. Đã đúng cây từ trước: ${skipped}.`);

    const orphans = await prisma.financeCategory.findMany({ where: { parentId: null, level: 1 } });
    const unmapped = orphans.filter(o => !CATEGORY_GROUPS.some(g => g.name === o.name));
    if (unmapped.length) {
        console.log(`\n⚠️  ${unmapped.length} danh mục cấp gốc không nằm trong danh sách nhóm chuẩn (có thể do kế toán tự thêm sau) — giữ nguyên, không đụng tới:`);
        unmapped.forEach(o => console.log(`   - [${o.group}] ${o.name}`));
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
