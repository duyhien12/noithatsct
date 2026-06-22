const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding: Quy trình khách hợp đồng - Phòng Thiết Kế...');

    const template = await prisma.scheduleTemplate.create({
        data: {
            name: 'Quy trình khách hợp đồng - Phòng Thiết Kế',
            type: 'Thiết kế',
            description: 'Quy trình xử lý khách hàng hợp đồng thiết kế: từ tiếp nhận đến bàn giao bản vẽ thi công.',
        },
    });

    const items = [
        // Giai đoạn 1: Tiếp nhận & Ký hợp đồng
        { name: 'Tiếp nhận đơn hàng', color: '#22c55e' },
        { name: 'Lập nhóm Zalo', color: '#22c55e' },
        { name: 'Khảo sát + đo, chụp ảnh thực tế', color: '#22c55e' },
        { name: 'Báo giá thiết kế', color: '#22c55e' },
        { name: 'Ký HĐ thiết kế', color: '#22c55e' },

        // Giai đoạn 2: PA sơ bộ
        { name: 'Hẹn ngày có PA sơ bộ', color: '#3b82f6' },
        { name: 'Lập PA sơ bộ', color: '#3b82f6' },
        { name: 'Chốt PA sơ bộ nội bộ', color: '#3b82f6' },
        { name: 'Hẹn gặp KH để bàn về PA sơ bộ', color: '#3b82f6' },
        { name: 'Sửa PA sơ bộ', color: '#3b82f6' },
        { name: 'Chốt PA sơ bộ với KH', color: '#3b82f6' },

        // Giai đoạn 3: Thiết kế 3D
        { name: 'Định hướng phong cách kiến trúc', color: '#8b5cf6' },
        { name: 'Hẹn ngày có PA 3D', color: '#8b5cf6' },
        { name: 'Dựng 3D bằng AI', color: '#8b5cf6' },
        { name: 'Chốt 3D nội bộ', color: '#8b5cf6' },
        { name: 'Bàn với KH về 3D', color: '#8b5cf6' },
        { name: 'Chốt 3D với KH', color: '#8b5cf6' },

        // Giai đoạn 4: Bản vẽ thi công
        { name: 'Hẹn ngày có hồ sơ thi công', color: '#f59e0b' },
        { name: 'Dựng lại 3D đã chốt bằng phần mềm', color: '#f59e0b' },
        { name: 'Lấy thông tin để làm bản vẽ chi tiết', color: '#f59e0b' },
        { name: 'Triển khai bản vẽ chi tiết', color: '#f59e0b' },
        { name: 'Sửa bản vẽ chi tiết', color: '#f59e0b' },
        { name: 'KCS bản vẽ', color: '#f59e0b' },
        { name: 'In hồ sơ', color: '#f59e0b' },
        { name: 'Bàn giao bản vẽ thi công', color: '#f59e0b' },
        { name: 'Thanh toán hợp đồng', color: '#ef4444' },
    ];

    for (let i = 0; i < items.length; i++) {
        await prisma.scheduleTemplateItem.create({
            data: {
                name: items[i].name,
                order: i,
                level: 0,
                wbs: '',
                duration: 1,
                weight: 1,
                color: items[i].color,
                templateId: template.id,
            },
        });
    }

    console.log(`✅ ${template.name}: ${items.length} bước`);
    console.log('Done!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
