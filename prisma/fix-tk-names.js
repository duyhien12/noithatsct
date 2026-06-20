const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const updates = [
    { code: 'KH125', name: 'TKNT.03.03.25 Khách sạn Hiệp Hằng (Tầng 1+2)' },
    { code: 'KH126', name: 'TKNT.03.03.25 Khách sạn Hiệp Hằng (Phòng Vip Tầng 3-6)' },
    { code: 'KH127', name: 'TKNT.03.03.25 Khách sạn Hiệp Hằng (Tầng 7)' },
    { code: 'KH128', name: 'TKNT.03.03.25 Khách sạn Hiệp Hằng (Phòng phổ thông Tầng 3-6)' },
    { code: 'KH129', name: 'TKNT.09.04.25 A Kiên tầng 1+phòng master' },
    { code: 'KH130', name: 'TKNT.01.05.25 Nhà anh Ngọc - Thác Bà' },
    { code: 'KH131', name: 'TKNT.12.06.25 A Trung Phương' },
    { code: 'KH132', name: 'TKNT.01.07.25 Công An Tỉnh (Phòng Tiếp Khách)' },
    { code: 'KH133', name: 'TKNT.09.04.25 A Kiên tầng 3 + phòng con tầng 2' },
    { code: 'KH134', name: 'TKNT.01.07.25 Công An Tỉnh' },
    { code: 'KH135', name: 'TKNT.24.07.25 Anh Yên' },
    { code: 'KH136', name: 'TKNT.28.08.25 Chị Thảo' },
    { code: 'KH137', name: 'TKNT.30.09.25 Diệp Đường Lương Yên 1' },
    { code: 'KH138', name: 'TKNT.32.09.25 Hội Doanh Nghiệp' },
    { code: 'KH139', name: 'TKNT.33.09.25 Phó Chánh Thanh Tra' },
    { code: 'KH140', name: 'TKNT.34.09.25 Nhà Thao Riverside' },
];

async function main() {
    for (const u of updates) {
        await prisma.customer.update({ where: { code: u.code }, data: { name: u.name } });
        console.log(`✓ ${u.code} → ${u.name}`);
    }
    console.log('\nXong!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
