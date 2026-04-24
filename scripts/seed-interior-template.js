const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const existing = await prisma.quotationTemplate.findFirst({
        where: { name: 'Mẫu báo giá nội thất - Phòng khách' },
    });
    if (existing) {
        console.log('Template đã tồn tại:', existing.id);
        return;
    }

    // Tạo template + category qua Prisma client (model này không đổi)
    const template = await prisma.quotationTemplate.create({
        data: {
            name: 'Mẫu báo giá nội thất - Phòng khách',
            type: 'Báo giá nội thất',
            vat: 10,
            discount: 0,
            managementFeeRate: 0,
            designFee: 0,
            categories: {
                create: [{ name: 'Phòng khách', order: 0 }],
            },
        },
        include: { categories: true },
    });

    const categoryId = template.categories[0].id;
    const now = new Date().toISOString();

    const items = [
        {
            name: 'Vách tivi',
            description: 'Vách phẳng chất liệu: Lõi ván MDF chống ẩm An Cường. Bề mặt phủ Arylic đơn sắc trắng\n- Nep PVC An Cường\n- Keo PUR',
            length: 2.7, width: 0, height: 3, quantity: 1, volume: 8.1, unit: 'm²', unitPrice: 2100000,
        },
        {
            name: 'Vách tivi',
            description: 'Vách bo cong: Gỗ MDF chống ẩm An Cường bề mặt phủ Melamin kết hợp lamilate\n- Nep PVC An Cường\n- Keo PUR',
            length: 0.26, width: 0, height: 3, quantity: 2, volume: 1.6, unit: 'm²', unitPrice: 1550000,
        },
        {
            name: 'Tủ trang trí',
            description: 'Chất liệu: Gỗ MDF chống ẩm An Cường bề mặt phủ Melamin 17mm, hậu Alu gương đen\n- Nep PVC An Cường\n- Keo PUR',
            length: 1, width: 0.35, height: 3, quantity: 2, volume: 6.0, unit: 'm²', unitPrice: 2850000,
        },
        {
            name: 'Tủ trang trí',
            description: '- Cánh kinh khung nhôm định hình 21-22 nhập khẩu. Cánh kinh 5mm cường lực màu xám khói',
            length: 1, width: 0, height: 1.2, quantity: 2, volume: 2.4, unit: 'm²', unitPrice: 2600000,
        },
        {
            name: 'Tủ trang trí',
            description: 'Dây led + máng nhôm',
            length: 0, width: 0, height: 0, quantity: 8, volume: 8, unit: 'md', unitPrice: 250000,
        },
        {
            name: 'Tủ trang trí',
            description: 'Nguồn Led đầu vào - 24 W - 12 VDC, 4way - mã 7602 907',
            length: 0, width: 0, height: 0, quantity: 2, volume: 2, unit: 'bộ', unitPrice: 335000,
        },
        {
            name: 'Tủ trang trí',
            description: 'Công tắc tăng giảm độ sáng của đèn, IMUNDEX, mã 7 601 906',
            length: 0, width: 0, height: 0, quantity: 2, volume: 2, unit: 'bộ', unitPrice: 275000,
        },
        {
            name: 'Vách sau sofa',
            description: 'Vách hộp chất liệu: Gỗ MDF chống ẩm An Cường bề mặt phủ Melamin\n- Nep PVC An Cường\n- Keo PUR\n- Trừ bức đá: 3.13×2.07=6.4m²\n- Trừ vách lam gỗ',
            length: 5.5, width: 0, height: 3, quantity: 1, volume: 5.3, unit: 'm²', unitPrice: 1550000,
        },
    ];

    // Insert items bằng raw SQL để dùng các cột mới (length, width, height, volume)
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const id = require('crypto').randomBytes(12).toString('hex');
        await prisma.$executeRaw`
            INSERT INTO "QuotationTemplateItem"
                (id, name, "order", unit, quantity, "mainMaterial", "auxMaterial", labor, "unitPrice", description, length, width, height, volume, "categoryId")
            VALUES
                (${id}, ${it.name}, ${i}, ${it.unit}, ${it.quantity}, 0, 0, 0, ${it.unitPrice}, ${it.description}, ${it.length}, ${it.width}, ${it.height}, ${it.volume}, ${categoryId})
        `;
    }

    console.log('✅ Đã tạo template:', template.name, '| ID:', template.id);
    console.log('   Category:', categoryId, '- Phòng khách,', items.length, 'hạng mục');
}

main().catch(console.error).finally(() => prisma.$disconnect());
