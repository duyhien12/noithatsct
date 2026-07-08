const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Bảng đơn giá mẫu cho Phiếu đặt hàng thiết kế nội thất — admin sửa được qua
// /design-orders/settings/price-list, không cần sửa code.
const defaultItems = [
    { name: 'Khảo sát hiện trạng', unit: 'lần' },
    { name: 'Lên mặt bằng bố trí nội thất 2D', unit: 'm2' },
    { name: 'Thiết kế phối cảnh 3D', unit: 'm2' },
    { name: 'Hồ sơ kỹ thuật thi công nội thất', unit: 'm2' },
    { name: 'Bóc tách vật tư sơ bộ', unit: 'gói' },
    { name: 'Lập danh mục thiết bị / phụ kiện', unit: 'gói' },
    { name: 'Chỉnh sửa phương án thiết kế', unit: 'lần' },
    { name: 'Chi phí phát sinh khác', unit: 'khoản' },
].map((item, i) => ({ ...item, defaultUnitPrice: 0, order: i, active: true }));

async function main() {
    const count = await prisma.designPriceListItem.count();
    if (count > 0) {
        console.log(`⚠️  Đã có ${count} dòng đơn giá — bỏ qua seed (xóa hết dữ liệu cũ trước nếu muốn seed lại).`);
        return;
    }
    const result = await prisma.designPriceListItem.createMany({ data: defaultItems });
    console.log(`✅ Seeded ${result.count} dòng đơn giá mẫu thiết kế.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
