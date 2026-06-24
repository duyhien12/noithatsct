const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // ── Template 1: Khách hàng ĐÃ CÓ thiết kế ──────────────────────────
    const t1 = await prisma.contractProcessTemplate.upsert({
        where: { id: 'tpl-co-thiet-ke' },
        update: {},
        create: {
            id: 'tpl-co-thiet-ke',
            name: 'Khách hàng đã có thiết kế',
            type: 'co_thiet_ke',
            description: 'Quy trình 6 bước cho khách hàng đã có bản thiết kế sẵn',
            isDefault: true,
        },
    });

    // Delete existing steps to re-seed cleanly
    await prisma.contractProcessTemplateStep.deleteMany({ where: { templateId: t1.id } });

    // Bước 1
    const b1 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t1.id, wbs: '1', name: 'Tiếp nhận KH HĐ', department: 'Kinh doanh', duration: 8, sortOrder: 0, level: 0, color: '#3B82F6' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t1.id, parentId: b1.id, wbs: '1.1', name: 'Tiếp nhận hồ sơ thiết kế', department: 'Kinh doanh', duration: 1, sortOrder: 1, level: 1, color: '#3B82F6' },
        { templateId: t1.id, parentId: b1.id, wbs: '1.2', name: 'Khảo sát hiện trạng', department: 'Kỹ thuật', duration: 2, sortOrder: 2, level: 1, color: '#3B82F6' },
        { templateId: t1.id, parentId: b1.id, wbs: '1.3', name: 'Kiểm tra hồ sơ kỹ thuật', department: 'Kỹ thuật', duration: 2, sortOrder: 3, level: 1, color: '#3B82F6' },
        { templateId: t1.id, parentId: b1.id, wbs: '1.4', name: 'Báo giá sơ bộ', department: 'Kinh doanh', duration: 3, sortOrder: 4, level: 1, color: '#3B82F6' },
        { templateId: t1.id, parentId: b1.id, wbs: '1.5', name: 'Chốt khách hàng', department: 'Kinh doanh', duration: 1, sortOrder: 5, level: 1, color: '#3B82F6' },
        { templateId: t1.id, parentId: b1.id, wbs: '1.6', name: 'Thu đợt 1 (50%)', department: 'Kế toán', duration: 1, sortOrder: 6, level: 1, color: '#3B82F6', isPaymentStep: true, paymentPercent: 50 },
    ]});

    // Bước 2
    const b2 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t1.id, wbs: '2', name: 'Duyệt kỹ thuật và vật liệu', department: 'Kỹ thuật', duration: 10, sortOrder: 10, level: 0, color: '#8B5CF6' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t1.id, parentId: b2.id, wbs: '2.1', name: 'Kiểm tra bản vẽ kỹ thuật', department: 'Kỹ thuật', duration: 2, sortOrder: 11, level: 1, color: '#8B5CF6' },
        { templateId: t1.id, parentId: b2.id, wbs: '2.2', name: 'Điều chỉnh kỹ thuật', department: 'Kỹ thuật', duration: 3, sortOrder: 12, level: 1, color: '#8B5CF6' },
        { templateId: t1.id, parentId: b2.id, wbs: '2.3', name: 'Duyệt vật liệu', department: 'Kinh doanh', duration: 2, sortOrder: 13, level: 1, color: '#8B5CF6' },
        { templateId: t1.id, parentId: b2.id, wbs: '2.4', name: 'Chốt màu sắc', department: 'Thiết kế', duration: 1, sortOrder: 14, level: 1, color: '#8B5CF6' },
        { templateId: t1.id, parentId: b2.id, wbs: '2.5', name: 'Chốt phụ kiện', department: 'Kỹ thuật', duration: 1, sortOrder: 15, level: 1, color: '#8B5CF6' },
        { templateId: t1.id, parentId: b2.id, wbs: '2.6', name: 'Nhận triển khai', department: 'Xưởng', duration: 1, sortOrder: 16, level: 1, color: '#8B5CF6' },
    ]});

    // Bước 3
    const b3 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t1.id, wbs: '3', name: 'Triển khai sản xuất', department: 'Xưởng', duration: 26, sortOrder: 20, level: 0, color: '#F59E0B' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t1.id, parentId: b3.id, wbs: '3.1', name: 'TKĐ bản sản xuất', department: 'Kỹ thuật', duration: 2, sortOrder: 21, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.2', name: 'Nhập NVL', department: 'Kho', duration: 3, sortOrder: 22, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.3', name: 'Đo hiện trạng lần cuối', department: 'Kỹ thuật', duration: 1, sortOrder: 23, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.4', name: 'Vẽ CNC', department: 'Xưởng', duration: 2, sortOrder: 24, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.5', name: 'Cắt CNC', department: 'Xưởng', duration: 3, sortOrder: 25, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.6', name: 'Dán cạnh', department: 'Xưởng', duration: 3, sortOrder: 26, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.7', name: 'Sơn hoàn thiện', department: 'Xưởng', duration: 5, sortOrder: 27, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.8', name: 'Lắp ráp tại xưởng', department: 'Xưởng', duration: 4, sortOrder: 28, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.9', name: 'Kiểm tra KCS', department: 'Xưởng', duration: 1, sortOrder: 29, level: 1, color: '#F59E0B' },
        { templateId: t1.id, parentId: b3.id, wbs: '3.10', name: 'Đặt hàng đối tác', department: 'Mua hàng', duration: 7, sortOrder: 30, level: 1, color: '#F59E0B' },
    ]});

    // Bước 4
    const b4 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t1.id, wbs: '4', name: 'Chuẩn bị thi công', department: 'Kỹ thuật', duration: 5, sortOrder: 40, level: 0, color: '#10B981' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t1.id, parentId: b4.id, wbs: '4.1', name: 'Kiểm tra tiến độ sản xuất', department: 'Kỹ thuật', duration: 1, sortOrder: 41, level: 1, color: '#10B981' },
        { templateId: t1.id, parentId: b4.id, wbs: '4.2', name: 'Kiểm tra hàng đối tác', department: 'Kỹ thuật', duration: 1, sortOrder: 42, level: 1, color: '#10B981' },
        { templateId: t1.id, parentId: b4.id, wbs: '4.3', name: 'Kiểm tra mặt bằng', department: 'Kỹ thuật', duration: 1, sortOrder: 43, level: 1, color: '#10B981' },
        { templateId: t1.id, parentId: b4.id, wbs: '4.4', name: 'Chuẩn bị vận chuyển', department: 'Xưởng', duration: 1, sortOrder: 44, level: 1, color: '#10B981' },
        { templateId: t1.id, parentId: b4.id, wbs: '4.5', name: 'Thu đợt 2 (30%)', department: 'Kế toán', duration: 1, sortOrder: 45, level: 1, color: '#10B981', isPaymentStep: true, paymentPercent: 30 },
    ]});

    // Bước 5
    const b5 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t1.id, wbs: '5', name: 'Thi công lắp đặt', department: 'Xưởng', duration: 12, sortOrder: 50, level: 0, color: '#EF4444' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t1.id, parentId: b5.id, wbs: '5.1', name: 'Vận chuyển', department: 'Xưởng', duration: 1, sortOrder: 51, level: 1, color: '#EF4444' },
        { templateId: t1.id, parentId: b5.id, wbs: '5.2', name: 'Lắp đặt nội thất', department: 'Xưởng', duration: 5, sortOrder: 52, level: 1, color: '#EF4444' },
        { templateId: t1.id, parentId: b5.id, wbs: '5.3', name: 'Lắp đặt thiết bị', department: 'Kỹ thuật', duration: 3, sortOrder: 53, level: 1, color: '#EF4444' },
        { templateId: t1.id, parentId: b5.id, wbs: '5.4', name: 'Xử lý phát sinh', department: 'Kỹ thuật', duration: 2, sortOrder: 54, level: 1, color: '#EF4444' },
        { templateId: t1.id, parentId: b5.id, wbs: '5.5', name: 'Nghiệm thu nội bộ', department: 'Kỹ thuật', duration: 1, sortOrder: 55, level: 1, color: '#EF4444' },
    ]});

    // Bước 6
    const b6 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t1.id, wbs: '6', name: 'Bàn giao - Quyết toán', department: 'Kinh doanh', duration: 5, sortOrder: 60, level: 0, color: '#6B7280' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t1.id, parentId: b6.id, wbs: '6.1', name: 'Nghiệm thu khách hàng', department: 'Kỹ thuật', duration: 1, sortOrder: 61, level: 1, color: '#6B7280' },
        { templateId: t1.id, parentId: b6.id, wbs: '6.2', name: 'Bàn giao', department: 'Kinh doanh', duration: 1, sortOrder: 62, level: 1, color: '#6B7280' },
        { templateId: t1.id, parentId: b6.id, wbs: '6.3', name: 'Thu đợt cuối (20%)', department: 'Kế toán', duration: 1, sortOrder: 63, level: 1, color: '#6B7280', isPaymentStep: true, paymentPercent: 20 },
        { templateId: t1.id, parentId: b6.id, wbs: '6.4', name: 'Xuất hóa đơn', department: 'Kế toán', duration: 1, sortOrder: 64, level: 1, color: '#6B7280' },
        { templateId: t1.id, parentId: b6.id, wbs: '6.5', name: 'Kích hoạt bảo hành', department: 'Kỹ thuật', duration: 1, sortOrder: 65, level: 1, color: '#6B7280' },
    ]});

    console.log('✅ Template 1 (Đã có thiết kế) seeded');

    // ── Template 2: Khách hàng CHƯA CÓ thiết kế ────────────────────────
    const t2 = await prisma.contractProcessTemplate.upsert({
        where: { id: 'tpl-chua-thiet-ke' },
        update: {},
        create: {
            id: 'tpl-chua-thiet-ke',
            name: 'Khách hàng chưa có thiết kế',
            type: 'chua_co_thiet_ke',
            description: 'Quy trình 8 bước cho khách hàng chưa có bản thiết kế',
            isDefault: true,
        },
    });

    await prisma.contractProcessTemplateStep.deleteMany({ where: { templateId: t2.id } });

    // Bước 1
    const c1 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t2.id, wbs: '1', name: 'Tiếp nhận khách hàng', department: 'Kinh doanh', duration: 8, sortOrder: 0, level: 0, color: '#3B82F6' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t2.id, parentId: c1.id, wbs: '1.1', name: 'Tiếp nhận nhu cầu', department: 'Kinh doanh', duration: 1, sortOrder: 1, level: 1, color: '#3B82F6' },
        { templateId: t2.id, parentId: c1.id, wbs: '1.2', name: 'Khảo sát hiện trạng', department: 'Kỹ thuật', duration: 2, sortOrder: 2, level: 1, color: '#3B82F6' },
        { templateId: t2.id, parentId: c1.id, wbs: '1.3', name: 'Lập nhiệm vụ thiết kế', department: 'Thiết kế', duration: 2, sortOrder: 3, level: 1, color: '#3B82F6' },
        { templateId: t2.id, parentId: c1.id, wbs: '1.4', name: 'Đề xuất thiết kế', department: 'Thiết kế', duration: 3, sortOrder: 4, level: 1, color: '#3B82F6' },
        { templateId: t2.id, parentId: c1.id, wbs: '1.5', name: 'Ký HĐ thiết kế', department: 'Kinh doanh', duration: 1, sortOrder: 5, level: 1, color: '#3B82F6' },
        { templateId: t2.id, parentId: c1.id, wbs: '1.6', name: 'Thu phí thiết kế', department: 'Kế toán', duration: 1, sortOrder: 6, level: 1, color: '#3B82F6', isPaymentStep: true, paymentPercent: 100 },
    ]});

    // Bước 2
    const c2 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t2.id, wbs: '2', name: 'Thiết kế phương án', department: 'Thiết kế', duration: 20, sortOrder: 10, level: 0, color: '#8B5CF6' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t2.id, parentId: c2.id, wbs: '2.1', name: 'Thiết kế mặt bằng', department: 'Thiết kế', duration: 5, sortOrder: 11, level: 1, color: '#8B5CF6' },
        { templateId: t2.id, parentId: c2.id, wbs: '2.2', name: 'Duyệt mặt bằng', department: 'Kinh doanh', duration: 2, sortOrder: 12, level: 1, color: '#8B5CF6' },
        { templateId: t2.id, parentId: c2.id, wbs: '2.3', name: 'Thiết kế 3D', department: 'Thiết kế', duration: 7, sortOrder: 13, level: 1, color: '#8B5CF6' },
        { templateId: t2.id, parentId: c2.id, wbs: '2.4', name: 'Duyệt 3D lần 1', department: 'Kinh doanh', duration: 2, sortOrder: 14, level: 1, color: '#8B5CF6' },
        { templateId: t2.id, parentId: c2.id, wbs: '2.5', name: 'Chỉnh sửa', department: 'Thiết kế', duration: 3, sortOrder: 15, level: 1, color: '#8B5CF6' },
        { templateId: t2.id, parentId: c2.id, wbs: '2.6', name: 'Duyệt 3D cuối', department: 'Kinh doanh', duration: 1, sortOrder: 16, level: 1, color: '#8B5CF6' },
    ]});

    // Bước 3
    const c3 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t2.id, wbs: '3', name: 'Triển khai kỹ thuật', department: 'Kỹ thuật', duration: 18, sortOrder: 20, level: 0, color: '#06B6D4' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t2.id, parentId: c3.id, wbs: '3.1', name: 'Hồ sơ kỹ thuật', department: 'Kỹ thuật', duration: 5, sortOrder: 21, level: 1, color: '#06B6D4' },
        { templateId: t2.id, parentId: c3.id, wbs: '3.2', name: 'Hồ sơ điện nước', department: 'Kỹ thuật', duration: 3, sortOrder: 22, level: 1, color: '#06B6D4' },
        { templateId: t2.id, parentId: c3.id, wbs: '3.3', name: 'Hồ sơ trần', department: 'Kỹ thuật', duration: 3, sortOrder: 23, level: 1, color: '#06B6D4' },
        { templateId: t2.id, parentId: c3.id, wbs: '3.4', name: 'Hồ sơ nội thất', department: 'Kỹ thuật', duration: 5, sortOrder: 24, level: 1, color: '#06B6D4' },
        { templateId: t2.id, parentId: c3.id, wbs: '3.5', name: 'Chốt vật liệu', department: 'Kinh doanh', duration: 2, sortOrder: 25, level: 1, color: '#06B6D4' },
    ]});

    // Bước 4
    const c4 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t2.id, wbs: '4', name: 'Báo giá và ký HĐ thi công', department: 'Kinh doanh', duration: 10, sortOrder: 30, level: 0, color: '#F59E0B' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t2.id, parentId: c4.id, wbs: '4.1', name: 'Bóc tách khối lượng', department: 'Kỹ thuật', duration: 3, sortOrder: 31, level: 1, color: '#F59E0B' },
        { templateId: t2.id, parentId: c4.id, wbs: '4.2', name: 'Lập báo giá', department: 'Kinh doanh', duration: 3, sortOrder: 32, level: 1, color: '#F59E0B' },
        { templateId: t2.id, parentId: c4.id, wbs: '4.3', name: 'Điều chỉnh báo giá', department: 'Kinh doanh', duration: 2, sortOrder: 33, level: 1, color: '#F59E0B' },
        { templateId: t2.id, parentId: c4.id, wbs: '4.4', name: 'Ký HĐ thi công', department: 'Kinh doanh', duration: 1, sortOrder: 34, level: 1, color: '#F59E0B' },
        { templateId: t2.id, parentId: c4.id, wbs: '4.5', name: 'Thu đợt 1 (50%)', department: 'Kế toán', duration: 1, sortOrder: 35, level: 1, color: '#F59E0B', isPaymentStep: true, paymentPercent: 50 },
    ]});

    // Bước 5
    const c5 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t2.id, wbs: '5', name: 'Triển khai sản xuất', department: 'Xưởng', duration: 24, sortOrder: 40, level: 0, color: '#F97316' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t2.id, parentId: c5.id, wbs: '5.1', name: 'TKĐ sản xuất', department: 'Kỹ thuật', duration: 2, sortOrder: 41, level: 1, color: '#F97316' },
        { templateId: t2.id, parentId: c5.id, wbs: '5.2', name: 'Nhập NVL', department: 'Kho', duration: 3, sortOrder: 42, level: 1, color: '#F97316' },
        { templateId: t2.id, parentId: c5.id, wbs: '5.3', name: 'Vẽ CNC', department: 'Xưởng', duration: 2, sortOrder: 43, level: 1, color: '#F97316' },
        { templateId: t2.id, parentId: c5.id, wbs: '5.4', name: 'Sản xuất', department: 'Xưởng', duration: 10, sortOrder: 44, level: 1, color: '#F97316' },
        { templateId: t2.id, parentId: c5.id, wbs: '5.5', name: 'KCS', department: 'Xưởng', duration: 1, sortOrder: 45, level: 1, color: '#F97316' },
        { templateId: t2.id, parentId: c5.id, wbs: '5.6', name: 'Đặt hàng đối tác', department: 'Mua hàng', duration: 7, sortOrder: 46, level: 1, color: '#F97316' },
    ]});

    // Bước 6
    const c6 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t2.id, wbs: '6', name: 'Chuẩn bị thi công', department: 'Kỹ thuật', duration: 3, sortOrder: 50, level: 0, color: '#10B981' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t2.id, parentId: c6.id, wbs: '6.1', name: 'Kiểm tra tiến độ', department: 'Kỹ thuật', duration: 1, sortOrder: 51, level: 1, color: '#10B981' },
        { templateId: t2.id, parentId: c6.id, wbs: '6.2', name: 'Kiểm tra mặt bằng', department: 'Kỹ thuật', duration: 1, sortOrder: 52, level: 1, color: '#10B981' },
        { templateId: t2.id, parentId: c6.id, wbs: '6.3', name: 'Thu đợt 2 (30%)', department: 'Kế toán', duration: 1, sortOrder: 53, level: 1, color: '#10B981', isPaymentStep: true, paymentPercent: 30 },
    ]});

    // Bước 7
    const c7 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t2.id, wbs: '7', name: 'Thi công', department: 'Xưởng', duration: 12, sortOrder: 60, level: 0, color: '#EF4444' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t2.id, parentId: c7.id, wbs: '7.1', name: 'Vận chuyển', department: 'Xưởng', duration: 1, sortOrder: 61, level: 1, color: '#EF4444' },
        { templateId: t2.id, parentId: c7.id, wbs: '7.2', name: 'Lắp đặt', department: 'Xưởng', duration: 7, sortOrder: 62, level: 1, color: '#EF4444' },
        { templateId: t2.id, parentId: c7.id, wbs: '7.3', name: 'Hoàn thiện', department: 'Xưởng', duration: 3, sortOrder: 63, level: 1, color: '#EF4444' },
        { templateId: t2.id, parentId: c7.id, wbs: '7.4', name: 'Nghiệm thu nội bộ', department: 'Kỹ thuật', duration: 1, sortOrder: 64, level: 1, color: '#EF4444' },
    ]});

    // Bước 8
    const c8 = await prisma.contractProcessTemplateStep.create({ data: { templateId: t2.id, wbs: '8', name: 'Bàn giao - Quyết toán', department: 'Kinh doanh', duration: 5, sortOrder: 70, level: 0, color: '#6B7280' } });
    await prisma.contractProcessTemplateStep.createMany({ data: [
        { templateId: t2.id, parentId: c8.id, wbs: '8.1', name: 'Nghiệm thu khách hàng', department: 'Kỹ thuật', duration: 1, sortOrder: 71, level: 1, color: '#6B7280' },
        { templateId: t2.id, parentId: c8.id, wbs: '8.2', name: 'Bàn giao', department: 'Kinh doanh', duration: 1, sortOrder: 72, level: 1, color: '#6B7280' },
        { templateId: t2.id, parentId: c8.id, wbs: '8.3', name: 'Thu đợt cuối (20%)', department: 'Kế toán', duration: 1, sortOrder: 73, level: 1, color: '#6B7280', isPaymentStep: true, paymentPercent: 20 },
        { templateId: t2.id, parentId: c8.id, wbs: '8.4', name: 'Xuất hóa đơn', department: 'Kế toán', duration: 1, sortOrder: 74, level: 1, color: '#6B7280' },
        { templateId: t2.id, parentId: c8.id, wbs: '8.5', name: 'Kích hoạt bảo hành', department: 'Kỹ thuật', duration: 1, sortOrder: 75, level: 1, color: '#6B7280' },
    ]});

    console.log('✅ Template 2 (Chưa có thiết kế) seeded');
    console.log('🎉 Contract process templates seeded successfully!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
