const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const updates = [
    { code: 'KH125', name: 'TKNT.29.08.25 Khách sạn Hiệp Hằng (Tầng Lửng)' },
    { code: 'KH126', name: 'TKNT.28.08.25 Khách sạn Hiệp Hằng (Phòng 405-404)' },
    { code: 'KH127', name: 'TKNT.30.08.25 Khách sạn Hiệp Hằng (Tầng 1)' },
    { code: 'KH128', name: 'TKNT.75.03.26 Nhà A Khôi Agribank' },
    { code: 'KH129', name: 'TKNT.01.06.26 Nhà A Nghị' },
    { code: 'KH130', name: 'TKNT.02.06.26 Nhà A Lệnh' },
    { code: 'KH131', name: 'TKNT.03.06.26 Nhà A Luân Thác Bà' },
    { code: 'KH132', name: 'TKNT.04.06.26 PGD Vietcombank' },
    { code: 'KH133', name: 'TKNT.05.06.26 PLV Phó GĐ + GĐ VTB' },
    { code: 'KH134', name: 'TKNT.06.06.26 Phòng Hội Trường Yên Lào' },
    { code: 'KH135', name: 'TKNT.07.06.26 Nhà A Bắc' },
];

async function main() {
    console.log('Cập nhật tên khách hàng (thêm mã TKNT vào đầu)...\n');
    for (const u of updates) {
        await prisma.customer.update({ where: { code: u.code }, data: { name: u.name } });
        console.log(`✓ ${u.code} → ${u.name}`);
    }
    console.log('\nHoàn thành!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
