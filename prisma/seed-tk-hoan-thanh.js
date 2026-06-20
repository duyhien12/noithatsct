const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const customers = [
    'TKNT.01.02.25 Thanh Yến',
    'TKNT.02.02.25 Tuấn Hiền',
    'TKNT.03.02.25 Anh Bình Kia',
    'TKNT.05.02.25 Bàn làm việc; Tủ để máy Tầng 2 Cty',
    'TKNT.06.02.25 Tủ kho công ty',
    'TKNT.05.03.25 Nội thất nhà anh Thọ',
    'TKNT.09.03.25 Nhà Tú Anh T1',
    'TKNT.14.04.25 Nhà A Trường (Tủ Bếp)',
    'TKNT.21.04.25 Phòng Họp Trực Tuyến Sở XD',
    'TKNT.03.05.25 Nhà Anh Hiển - Kiểm Lâm',
    'TKNT.02.05.25 Nhà A Sơn Đ.Trần Phú T1',
    'TKNT.12.05.25 Nhà A Chính KM3 P.Bếp+P.Ngủ1+P.Thờ',
    'TKNT.08.05.25 Nhà Chú Thuần (P.Ngủ)',
    'TKNT.08.05.25 Nhà Chị Lý (Tủ Bếp)',
    'TKNT.07.05.25 Nhà A Trường (Cháu A Cường)',
    'TKNT.02.05.25 Nhà A Sơn Đ.Trần Phú T2',
    'TKNT.19.05.25 Nhà A Tùng Đ. Quang Trung',
    'TKNT.09.05.25 Nhà Tú Anh 3 P.Ngủ',
    'TKNT.09.05.25 Nhà Tú Anh P.Thờ',
    'TKNT.12.05.25 Nhà A Chính KM3 P.Ngủ 2',
    'TKNT.02.06.25 P.Ngủ Nhà A Tuấn',
    'TKNT.04.06.25 Nhà Cường Hương',
    'TKNT.07.07.25 Ban Quản Lý Dự Án',
    'TKNT.27.06.25 Nhà Chị Thuỳ Đ.Nguyễn Khắc Nhu',
    'TKNT.18.07.25 Anh Hải Tây Cốc',
    'TK.25.07.25 Anh Kiên Vân Yên',
    'TKNT.21.07.25 Nhà A Hải Tây Cốc',
    'TKNT.25.07.25 Chi Cục Thuế',
    'TKNT.30.07.25 VietinBank KM4 (Phòng PGĐ)',
];

async function getNextCodeNum() {
    const all = await prisma.customer.findMany({ select: { code: true } });
    return all
        .map(r => r.code.slice(2))
        .filter(s => /^\d+$/.test(s))
        .reduce((max, s) => Math.max(max, Number(s)), 0);
}

async function main() {
    console.log('Thêm khách hàng Phòng Thiết Kế - Hoàn thành...\n');

    let num = await getNextCodeNum();

    for (const name of customers) {
        num++;
        const code = `KH${String(num).padStart(3, '0')}`;
        await prisma.customer.create({
            data: {
                code,
                name,
                phone: '',
                pipelineStage: 'Hoàn thành',
                createdByRole: 'thiet_ke',
                status: 'Khách hàng',
            },
        });
        console.log(`✓ ${code} | ${name}`);
    }

    console.log(`\nĐã thêm ${customers.length} khách hàng vào cột Khách hoàn thành.`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
