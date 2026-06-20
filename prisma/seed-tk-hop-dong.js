const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const customers = [
    { projectName: 'TKNT.03.03.25', name: 'Khách sạn Hiệp Hằng (Tầng 1+2)' },
    { projectName: 'TKNT.03.03.25', name: 'Khách sạn Hiệp Hằng (Phòng Vip Tầng 3-6)' },
    { projectName: 'TKNT.03.03.25', name: 'Khách sạn Hiệp Hằng (Tầng 7)' },
    { projectName: 'TKNT.03.03.25', name: 'Khách sạn Hiệp Hằng (Phòng phổ thông Tầng 3-6)' },
    { projectName: 'TKNT.09.04.25', name: 'A Kiên tầng 1+phòng master' },
    { projectName: 'TKNT.01.05.25', name: 'Nhà anh Ngọc - Thác Bà' },
    { projectName: 'TKNT.12.06.25', name: 'A Trung Phương' },
    { projectName: 'TKNT.01.07.25', name: 'Công An Tỉnh (Phòng Tiếp Khách)' },
    { projectName: 'TKNT.09.04.25', name: 'A Kiên tầng 3 + phòng con tầng 2' },
    { projectName: 'TKNT.01.07.25', name: 'Công An Tỉnh' },
    { projectName: 'TKNT.24.07.25', name: 'Anh Yên' },
    { projectName: 'TKNT.28.08.25', name: 'Chị Thảo' },
    { projectName: 'TKNT.30.09.25', name: 'Diệp Đường Lương Yên 1' },
    { projectName: 'TKNT.32.09.25', name: 'Hội Doanh Nghiệp' },
    { projectName: 'TKNT.33.09.25', name: 'Phó Chánh Thanh Tra' },
    { projectName: 'TKNT.34.09.25', name: 'Nhà Thao Riverside' },
];

async function getNextCodeNum() {
    const all = await prisma.customer.findMany({ select: { code: true } });
    const maxNum = all
        .map(r => r.code.slice(2))
        .filter(s => /^\d+$/.test(s))
        .reduce((max, s) => Math.max(max, Number(s)), 0);
    return maxNum;
}

async function main() {
    console.log('Thêm khách hàng Phòng Thiết Kế - Hợp đồng...\n');

    let num = await getNextCodeNum();

    for (const c of customers) {
        num++;
        const code = `KH${String(num).padStart(3, '0')}`;
        await prisma.customer.create({
            data: {
                code,
                name: c.name,
                phone: '',
                pipelineStage: 'Hợp đồng',
                createdByRole: 'thiet_ke',
                status: 'Khách hàng',
                projectName: c.projectName,
            },
        });
        console.log(`✓ ${code} | ${c.projectName} | ${c.name}`);
    }

    console.log(`\nĐã thêm ${customers.length} khách hàng vào cột Khách hợp đồng của Phòng Thiết Kế.`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
