import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TEMPLATE = {
    name: 'Mẫu báo giá nội thất',
    type: 'Báo giá nội thất',
    description: 'Mẫu chuẩn cho dự án nội thất căn hộ / nhà phố',
    vat: 10, discount: 0, managementFeeRate: 0, designFee: 0,
    categories: [
        {
            name: 'Phòng khách',
            items: [
                { name: 'Trần thạch cao giật cấp',      unit: 'm²',  description: 'Trần thạch cao thường + khung xương, đèn LED viền' },
                { name: 'Sơn tường',                    unit: 'm²',  description: 'Sơn nước nội thất Dulux 2 lớp lót + 2 lớp phủ' },
                { name: 'Vách ốp tivi',                 unit: 'm²',  description: 'Gỗ công nghiệp phủ Melamine / Acrylic' },
                { name: 'Kệ tivi + tủ âm tường',        unit: 'bộ',  quantity: 1, description: 'Gỗ HDF chống ẩm, cánh acrylic bóng gương' },
                { name: 'Sofa',                         unit: 'bộ',  quantity: 1, description: 'Sofa vải / da công nghiệp cao cấp' },
                { name: 'Bàn trà',                      unit: 'cái', quantity: 1, description: 'Mặt kính cường lực / đá marble, khung inox' },
                { name: 'Đèn trang trí phòng khách',    unit: 'bộ',  quantity: 1, description: 'Đèn thả trần / ốp trần trang trí' },
            ],
        },
        {
            name: 'Phòng ngủ master',
            items: [
                { name: 'Trần thạch cao',               unit: 'm²',  description: 'Trần thạch cao phẳng + đèn âm trần' },
                { name: 'Sơn tường',                    unit: 'm²',  description: 'Sơn nước nội thất, màu theo yêu cầu' },
                { name: 'Giường ngủ đôi',               unit: 'bộ',  quantity: 1, description: 'Đầu giường bọc nỉ / da, khung gỗ HDF' },
                { name: 'Tủ quần áo âm tường',          unit: 'm²',  description: 'Gỗ HDF chống ẩm, cánh trượt gương' },
                { name: 'Bàn trang điểm',               unit: 'bộ',  quantity: 1, description: 'Gỗ HDF, gương led đèn hắt' },
                { name: 'Kệ đầu giường',                unit: 'bộ',  quantity: 1, description: 'Gỗ công nghiệp kết hợp đèn đêm' },
            ],
        },
        {
            name: 'Phòng ngủ 2',
            items: [
                { name: 'Trần thạch cao',               unit: 'm²',  description: 'Trần thạch cao phẳng + đèn âm trần' },
                { name: 'Sơn tường',                    unit: 'm²',  description: 'Sơn nước nội thất, màu theo yêu cầu' },
                { name: 'Giường ngủ đơn',               unit: 'bộ',  quantity: 1, description: 'Đầu giường bọc nỉ, khung gỗ HDF' },
                { name: 'Tủ quần áo',                   unit: 'm²',  description: 'Gỗ HDF chống ẩm, cánh mở' },
                { name: 'Bàn học',                      unit: 'bộ',  quantity: 1, description: 'Gỗ HDF, kệ sách trên bàn' },
            ],
        },
        {
            name: 'Phòng bếp + ăn',
            items: [
                { name: 'Tủ bếp dưới',                 unit: 'md',  description: 'Gỗ HDF chống ẩm Austdoor, cánh acrylic bóng (gồm bồn rửa)' },
                { name: 'Tủ bếp trên',                 unit: 'md',  description: 'Gỗ HDF chống ẩm, cánh acrylic bóng hoặc Melamine' },
                { name: 'Mặt đá bếp',                  unit: 'md',  description: 'Đá nhân tạo Solid Surface / đá marble Việt Nam' },
                { name: 'Bàn ăn',                      unit: 'bộ',  quantity: 1, description: 'Mặt đá / gỗ tự nhiên, chân sắt sơn tĩnh điện' },
                { name: 'Ghế ăn',                      unit: 'cái', description: 'Ghế gỗ / nỉ bọc, theo bộ bàn ăn' },
                { name: 'Đèn bàn ăn',                  unit: 'bộ',  quantity: 1, description: 'Đèn thả trần trang trí phía trên bàn ăn' },
            ],
        },
        {
            name: 'Phụ & hoàn thiện',
            items: [
                { name: 'Gương phòng tắm + tủ lavabo', unit: 'bộ',  quantity: 1, description: 'Gương led cảm ứng + tủ treo tường chống ẩm' },
                { name: 'Rèm cửa phòng khách',         unit: 'bộ',  quantity: 1, description: 'Rèm 2 lớp: vải + blackout, ray nhôm' },
                { name: 'Rèm phòng ngủ',               unit: 'bộ',  description: 'Rèm blackout cản sáng, ray nhôm' },
                { name: 'Phụ kiện + thi công lắp đặt', unit: 'bộ',  quantity: 1, description: 'Chi phí thi công, vận chuyển, lắp đặt' },
            ],
        },
    ],
};

async function main() {
    const deleted = await prisma.quotationTemplate.deleteMany({});
    console.log(`✓ Xóa ${deleted.count} mẫu cũ`);

    const tmpl = await prisma.quotationTemplate.create({
        data: {
            name: TEMPLATE.name,
            type: TEMPLATE.type,
            description: TEMPLATE.description,
            vat: TEMPLATE.vat,
            discount: TEMPLATE.discount,
            managementFeeRate: TEMPLATE.managementFeeRate,
            designFee: TEMPLATE.designFee,
            categories: {
                create: TEMPLATE.categories.map((cat, ci) => ({
                    name: cat.name,
                    order: ci,
                    items: {
                        create: cat.items.map((item, ii) => ({
                            name: item.name,
                            order: ii,
                            unit: item.unit || 'm²',
                            quantity: item.quantity || 0,
                            mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0,
                            description: item.description || '',
                            length: 0, width: 0, height: 0, volume: 0,
                        })),
                    },
                })),
            },
        },
        include: { categories: { include: { items: true } } },
    });

    console.log(`✓ Tạo xong: "${tmpl.name}"`);
    tmpl.categories.forEach(c => console.log(`  • ${c.name}: ${c.items.length} hạng mục`));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
