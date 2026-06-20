const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const customers = [
    'TKNT.02.04.25 A Vương tầng 1+2',
    'TKNT.03.04.25 A Kiên tầng 1+phòng master',
    'TKNT.01.04.25 A Vương tầng 3',
    'TKNT.02.04.25 A Vương tầng 4',
    'TKNT.06.04.25 A Chung T1 + T4',
    'TKNT.05.04.25 A Chung T2 + T3 +T5',
    'TKNT.09.06.25 Sửa lại tầng 1 nhà chị Vân',
    'TKNT.12.06.25 A Trung Phương',
    'TKNT.04.04.25 A Kiên tầng 3 + phòng con tầng 2',
    'TKNT.10.06.25 Nhà Linh Loan ( tầng 1)',
    'TKNT.08.05.25 Nhà anh Ngọc - Thác Bà',
    'TKNT.07.05.25 Nhà A Sơn Đ.Trần Phú T1',
    'TKNT.09.05.25 Nhà A Tùng Đ. Quang Trung',
    'TKNT.15.06.25 Nhà A Hồng Vân',
    'TKNT.11.06.25 Nhà A Sơn Hà Ca',
    'TKNT.21.07.25 Công An Tỉnh ( Phòng Tiếp Khách)',
    'TKNT.22.07.25 Ban Quản Lý Dự Án',
    'TKNT.20.07.25 Công An Tỉnh',
    'TKNT.13.06.25 Nhà Chị Thủy Đ.Nguyễn Khắc Nhu',
    'TKNT.18.07.25 Anh Hải Tây Côc',
    'TKNT.23.07.25 Anh Yên',
    'TKNT.24.07.25 Anh Kiên Văn Yên',
    'TKNT.21.07.25 Nhà A Hải Tây Côc',
    'TKNT.25.07.25 Chi Cục Thuế',
    'TKNT.26.07.25 Vietinbank KM4 (phòng PGĐ)',
    'TKNT.36.09.25 Ông Hùng 96 Nguyễn Thái Học',
    'TKNT.15.07.25 Anh Tùng Casamony',
    'TKNT.27.08.25 Chị Thảo',
    'TKNT.31.08.25 Anh Sử',
    'TKNT.32.09.25 Nhà Diệp Đường Lương Yên 1',
    'TKNT.33.09.25 Phòng PGĐ Thuế',
    'TKNT.34.09.25 Hội Doanh Nghiệp',
    'TKNT.35.09.25 Phòng Thờ Nhà Linh Nga',
    'TKNT.37.09.25 Nhà Thao Riverside',
    'TKNT.35.09.25 P. Ngủ Nhà Chị Nga Quang Trung',
    'TKNT.38.09.25 Anh Hoàn TT Kiểm Định',
    'TKNT.39.09.25 Thuế Sapa',
    'TKNT.40.09.25 TT Hội Nghị Tỉnh LC',
    'TKNT.41.09.25 Anh Thái Trường Nghề',
    'TKNT.42.09.25 Anh Dũng Đỗ Thị Hạnh Phúc',
    'TKNT.33.09.25 Chánh Thanh Tra',
    'TKNT.43.09.25 Vách Nhà Chị Thủy Anh',
    'TKNT.44.09.25 Nhà Quỳnh Nhân Lục Yên',
    'TKNT.45.09.25 Nhà Anh Tuyên',
    'TKNT.46.09.25 Nhà Anh Đồng',
    'TKNT.47.09.25 Nhà Tú Thác Bà',
    'TKNT.48.09.25 Nhà Anh Hà Điện Lực',
    'TKNT.49.09.25 Nhà Anh Hưng Hằng KM12 Yên Bình',
    'TKNT.50.10.25 Ngân Hàng Bắc Á',
    'TKNT.51.10.25 Chị Bình Suối Mơ',
    'TKNT.52.10.25 Nhà Anh Đức CĐSP',
    'TKNT.55.10.25 Chị Hương',
    'TKNT.56.10.25 Phòng Làm Việc PGĐ',
    'TKNT.57.10.25 Phòng Nghỉ VIP CA Tỉnh',
    'TKNT.58.10.25 Thuế Lào Cai',
    'Anh Hùng Hảo Gia',
    'TKNT.59.11.25 Ông Khiêm',
    'TKNT.60.11.25 Anh Tùng Việt Trì',
    'TKNT.61.12.25 Nhà Văn Hiệp',
    'TKNT.62.12.25 Phòng Ăn Vietcombank',
    'TKNT.63.02.26 Anh Toán Vincom',
    'TKNT.64.02.26 Chị Hoa Riverside',
    'TKNT.65.02.26 Chú Thắc Riverside',
    'TKNT.67.02.26 Phòng GD Vietcombank',
    'TKNT.68.02.26 Phòng Ngủ Nhà Chị Loan',
    'TKNT.69.02.26 Phòng Ngủ Nhà A Lục',
    'TKNT.70.02.26 Phòng Ngủ Nhà Chị Huyền',
    'TKNT.71.02.26 Tủ Giày Nhà Chị Trà',
    'TKNT.72.02.26 Hội Trường Công An Giao Thông',
    'TKNT.73.02.26 TK Bàn Làm Việc A Thanh',
    'TKNT.74.02.26 Sảnh Chờ Thuế',
    'TKNT.76.03.26 Nhà Chị Hải RVS Tầng 1+4',
    'TKNT.76.03.26 Nhà Chị Hải RVS Tầng 2+3',
    'TKNT.77.03.26 Nhà A Nghĩa Vincom',
    'TKNT.78.03.26 Phòng Ngủ Nhà A Đào',
    'TKNT.29.08.25 Khách sạn Hiệp Hằng ( phòng ngủ víp)',
    'TKSV.79.03.26 Tiêu Cảnh T1 Công An Tỉnh',
    'TKNT.80.03.26 Thuế Bắc Hà',
    'TKNT.81.03.26 Nhà Chị Quỳnh',
];

async function getNextCodeNum() {
    const all = await prisma.customer.findMany({ select: { code: true } });
    return all
        .map(r => r.code.slice(2))
        .filter(s => /^\d+$/.test(s))
        .reduce((max, s) => Math.max(max, Number(s)), 0);
}

async function main() {
    console.log('Thêm khách hàng Phòng Thiết Kế - Khách chờ...\n');

    let num = await getNextCodeNum();

    for (const name of customers) {
        num++;
        const code = `KH${String(num).padStart(3, '0')}`;
        await prisma.customer.create({
            data: {
                code,
                name,
                phone: '',
                pipelineStage: 'Ưu tiên',
                createdByRole: 'thiet_ke',
                status: 'Khách hàng',
            },
        });
        console.log(`✓ ${code} | ${name}`);
    }

    console.log(`\nĐã thêm ${customers.length} khách hàng vào cột Khách chờ.`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
