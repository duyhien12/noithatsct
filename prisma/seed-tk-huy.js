const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const customers = [
    'TKNT.03.03.25 Anh Hùng Hường',
    'TKNT.04.03.25 Anh Mạnh Sử',
    'TKNT.04.02.25 Công ty Quan Wei - Phòng GĐ',
    'TKNT.01.03.25 Nội thất phố phòng CAGT 01',
    'TKNT.01.03.25 Nội thất phố phòng CAGT 02',
    'TKNT.06.03.25 Nội thất văn phòng anh Nam',
    'TKNT.07.03.25 Nhà điều hành Resort Le Champ - Phòng phó giám đốc + Phòng cán bộ',
    'TKNT.07.03.25 Nhà điều hành Resort Le Champ - Phòng giám đốc + Phòng họp',
    'TKNT.07.03.25 Nhà điều hành Resort Le Champ - Phòng thờ + Bếp',
    'TKNT.04.02.25 Công ty Quan Wei - Phòng ăn',
    'TKNT.08.03.25 Nhà anh Điều (Trần Yên)',
    'TKNT.10.03.25 Nhà Linh Loan (tầng 1)',
    'TKNT.14.04.25 Nhà A Trong (Phòng Bếp)',
    'TKNT.22.04.25 Nhà A Dũng',
    'TKNT.02.05.25 Nhà A Cường Hương',
    'TKNT.06.05.25 Nhà A Thắng CĐN',
    'TKNT.13.05.25 Nhà Chị Trang (Sửa lại P.Ngủ Master)',
    'TKNT.24.05.25 Nhà A Quang P.Ngủ',
    'TKNT.05.06.25 Nhà A Hồng Vân',
    'TKNT.18.06.25 Nhà Cường Ca Phòng CSKT',
    'TKNT.31.07.25 Resort Thác Bà',
];

async function getNextCodeNum() {
    const all = await prisma.customer.findMany({ select: { code: true } });
    return all
        .map(r => r.code.slice(2))
        .filter(s => /^\d+$/.test(s))
        .reduce((max, s) => Math.max(max, Number(s)), 0);
}

async function main() {
    console.log('Thêm khách hàng Phòng Thiết Kế - Khách huỷ...\n');

    let num = await getNextCodeNum();

    for (const name of customers) {
        num++;
        const code = `KH${String(num).padStart(3, '0')}`;
        await prisma.customer.create({
            data: {
                code,
                name,
                phone: '',
                pipelineStage: 'Huỷ',
                createdByRole: 'thiet_ke',
                status: 'Khách hàng',
            },
        });
        console.log(`✓ ${code} | ${name}`);
    }

    console.log(`\nĐã thêm ${customers.length} khách hàng vào cột Khách huỷ.`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
