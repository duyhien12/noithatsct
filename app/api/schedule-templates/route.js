import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { scheduleTemplateCreateSchema } from '@/lib/validations/scheduleTemplate';

// Default templates to auto-seed if none exist
let seeded = false;
async function ensureDefaultTemplates() {
    if (seeded) return;
    const count = await prisma.scheduleTemplate.count();
    if (count > 0) { seeded = true; return; }

    console.log('[schedule-templates] Auto-seeding default templates...');

    // Template 1: Thi công xây thô
    const tpl1 = await prisma.scheduleTemplate.create({
        data: { name: 'Thi công xây thô 3 tháng', type: 'Xây thô', description: 'Mẫu tiêu chuẩn cho công trình xây thô nhà phố 3-4 tầng' },
    });
    const items1 = [
        { name: 'Phần Móng', level: 0, wbs: '1', duration: 15, weight: 3, color: '#ef4444' },
        { name: 'Đào đất, san lấp', level: 1, wbs: '1.1', duration: 3, weight: 1, color: '', parentIdx: 0, predIdx: null },
        { name: 'Ép cọc / Khoan nhồi', level: 1, wbs: '1.2', duration: 4, weight: 1, color: '', parentIdx: 0, predIdx: 1 },
        { name: 'Làm thép đài móng', level: 1, wbs: '1.3', duration: 3, weight: 1, color: '', parentIdx: 0, predIdx: 2 },
        { name: 'Đổ bê tông đài móng', level: 1, wbs: '1.4', duration: 2, weight: 1, color: '', parentIdx: 0, predIdx: 3 },
        { name: 'Xây tường móng + chống thấm', level: 1, wbs: '1.5', duration: 3, weight: 1, color: '', parentIdx: 0, predIdx: 4 },
        { name: 'Phần Thô', level: 0, wbs: '2', duration: 45, weight: 5, color: '#f59e0b', predIdx: 0 },
        { name: 'Cốt thép + ván khuôn tầng 1', level: 1, wbs: '2.1', duration: 7, weight: 1, color: '', parentIdx: 6 },
        { name: 'Đổ bê tông sàn tầng 1', level: 1, wbs: '2.2', duration: 2, weight: 1, color: '', parentIdx: 6, predIdx: 7 },
        { name: 'Xây tường tầng 1', level: 1, wbs: '2.3', duration: 7, weight: 1, color: '', parentIdx: 6, predIdx: 8 },
        { name: 'Cốt thép + ván khuôn tầng 2', level: 1, wbs: '2.4', duration: 7, weight: 1, color: '', parentIdx: 6, predIdx: 9 },
        { name: 'Đổ bê tông sàn tầng 2', level: 1, wbs: '2.5', duration: 2, weight: 1, color: '', parentIdx: 6, predIdx: 10 },
        { name: 'Xây tường tầng 2', level: 1, wbs: '2.6', duration: 7, weight: 1, color: '', parentIdx: 6, predIdx: 11 },
        { name: 'Đổ bê tông mái', level: 1, wbs: '2.7', duration: 3, weight: 1, color: '', parentIdx: 6, predIdx: 12 },
        { name: 'Hoàn thiện thô', level: 0, wbs: '3', duration: 25, weight: 3, color: '#22c55e', predIdx: 6 },
        { name: 'Trát tường trong + ngoài', level: 1, wbs: '3.1', duration: 10, weight: 1, color: '', parentIdx: 14 },
        { name: 'Lắp đặt điện nước âm tường', level: 1, wbs: '3.2', duration: 7, weight: 1, color: '', parentIdx: 14, predIdx: 15 },
        { name: 'Chống thấm sàn vệ sinh', level: 1, wbs: '3.3', duration: 3, weight: 1, color: '', parentIdx: 14, predIdx: 16 },
        { name: 'Cán nền', level: 1, wbs: '3.4', duration: 5, weight: 1, color: '', parentIdx: 14, predIdx: 17 },
    ];
    await createTemplateItems(tpl1.id, items1);

    // Template 2: Nội thất tiêu chuẩn
    const tpl2 = await prisma.scheduleTemplate.create({
        data: { name: 'Thi công nội thất tiêu chuẩn', type: 'Nội thất', description: 'Mẫu hoàn thiện nội thất căn hộ/nhà phố' },
    });
    const items2 = [
        { name: 'Sơn & Trang trí', level: 0, wbs: '1', duration: 12, weight: 2, color: '#8b5cf6' },
        { name: 'Sơn lót tường', level: 1, wbs: '1.1', duration: 3, weight: 1, color: '', parentIdx: 0 },
        { name: 'Sơn phủ 2 lớp', level: 1, wbs: '1.2', duration: 4, weight: 1, color: '', parentIdx: 0, predIdx: 1 },
        { name: 'Sơn trần thạch cao', level: 1, wbs: '1.3', duration: 3, weight: 1, color: '', parentIdx: 0, predIdx: 2 },
        { name: 'Giấy dán tường', level: 1, wbs: '1.4', duration: 2, weight: 1, color: '', parentIdx: 0, predIdx: 3 },
        { name: 'Ốp lát & Sàn', level: 0, wbs: '2', duration: 10, weight: 2, color: '#f59e0b', predIdx: 0 },
        { name: 'Lát gạch nền', level: 1, wbs: '2.1', duration: 5, weight: 1, color: '', parentIdx: 5 },
        { name: 'Ốp gạch vệ sinh', level: 1, wbs: '2.2', duration: 3, weight: 1, color: '', parentIdx: 5, predIdx: 6 },
        { name: 'Lắp sàn gỗ phòng ngủ', level: 1, wbs: '2.3', duration: 2, weight: 1, color: '', parentIdx: 5, predIdx: 7 },
        { name: 'Lắp đặt thiết bị', level: 0, wbs: '3', duration: 8, weight: 3, color: '#3b82f6', predIdx: 5 },
        { name: 'Thiết bị vệ sinh', level: 1, wbs: '3.1', duration: 2, weight: 1, color: '', parentIdx: 9 },
        { name: 'Điện (đèn, ổ cắm)', level: 1, wbs: '3.2', duration: 3, weight: 1, color: '', parentIdx: 9, predIdx: 10 },
        { name: 'Lắp tủ bếp', level: 1, wbs: '3.3', duration: 3, weight: 1, color: '', parentIdx: 9, predIdx: 11 },
        { name: 'Lắp cửa gỗ + kính', level: 1, wbs: '3.4', duration: 2, weight: 1, color: '', parentIdx: 9, predIdx: 12 },
        { name: 'Nội thất & Bàn giao', level: 0, wbs: '4', duration: 5, weight: 2, color: '#22c55e', predIdx: 9 },
        { name: 'Kê đặt nội thất', level: 1, wbs: '4.1', duration: 2, weight: 1, color: '', parentIdx: 14 },
        { name: 'Vệ sinh tổng', level: 1, wbs: '4.2', duration: 1, weight: 1, color: '', parentIdx: 14, predIdx: 15 },
        { name: 'Nghiệm thu & Bàn giao', level: 1, wbs: '4.3', duration: 2, weight: 1, color: '', parentIdx: 14, predIdx: 16 },
    ];
    await createTemplateItems(tpl2.id, items2);

    console.log('[schedule-templates] Seeded 2 default templates');
}

async function createTemplateItems(templateId, items) {
    const created = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = await prisma.scheduleTemplateItem.create({
            data: {
                name: item.name,
                order: i,
                level: item.level,
                wbs: item.wbs,
                duration: item.duration,
                weight: item.weight,
                color: item.color || '',
                parentId: item.parentIdx != null ? created[item.parentIdx].id : null,
                predecessorId: item.predIdx != null ? created[item.predIdx].id : null,
                templateId,
            },
        });
        created.push(c);
    }
}

let seededCarePlan = false;
async function ensureCarePlanTemplate() {
    if (seededCarePlan) return;
    const exists = await prisma.scheduleTemplate.findFirst({ where: { name: 'Kế hoạch chăm sóc khách hàng - KD' } });
    if (exists) { seededCarePlan = true; return; }

    console.log('[schedule-templates] Seeding care plan template...');
    const tpl = await prisma.scheduleTemplate.create({
        data: { name: 'Kế hoạch chăm sóc khách hàng - KD', type: 'Chăm sóc KH', description: 'Quy trình chăm sóc khách hàng tiềm năng đến khi chuyển sang khách ưu tiên' },
    });
    const cpItems = [
        { name: 'Bước 1: Tiếp nhận khách hàng',                                                                                                                          level: 0, wbs: '1',   duration: 11, weight: 1, color: '#16a34a' },
        { name: 'Kết bạn Zalo với khách hàng',                                                                                                                            level: 1, wbs: '',     duration: 2,  weight: 1, color: '', parentIdx: 0 },
        { name: 'Phân loại nhà: Biệt thự – Nhà phố – Văn phòng',                                                                                                         level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 0 },
        { name: 'Tiến độ XD: Đang xây thô – Đang hoàn thiện – Thời gian về nhà mới',                                                                                    level: 1, wbs: '',     duration: 2,  weight: 1, color: '', parentIdx: 0 },
        { name: 'Nội dung cần biết: Diện tích – Ngân sách dự kiến – Thời điểm làm nội thất – Nguồn khách từ đâu',                                                       level: 1, wbs: '',     duration: 4,  weight: 1, color: '', parentIdx: 0 },
        { name: 'Bước 2: Gửi thông tin về SCT',                                                                                                                          level: 0, wbs: '2',   duration: 7,  weight: 1, color: '#ca8a04', predIdx: 0 },
        { name: 'Chuyển Video xưởng sản xuất của SCT',                                                                                                                   level: 1, wbs: '2.1', duration: 2,  weight: 1, color: '', parentIdx: 5 },
        { name: 'Chuyển ảnh Showroom trưng bày vật liệu của SCT',                                                                                                        level: 1, wbs: '2.2', duration: 2,  weight: 1, color: '', parentIdx: 5 },
        { name: 'Chuyển ảnh Catalogue các vật liệu An Cường',                                                                                                            level: 1, wbs: '2.3', duration: 2,  weight: 1, color: '', parentIdx: 5 },
        { name: 'Mời tham quan Showroom, xưởng sản xuất và các công trình nội thất hoàn thiện của SCT',                                                                  level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 5 },
        { name: 'Bước 3: Gọi điện, nhắn tin thăm hỏi khách hàng',                                                                                                       level: 0, wbs: '3',   duration: 7,  weight: 1, color: '#ea580c', predIdx: 5 },
        { name: 'Anh/chị thích phong cách nội thất gì',                                                                                                                  level: 1, wbs: '3.1', duration: 2,  weight: 1, color: '', parentIdx: 10 },
        { name: 'Hiện nay a/c đã tham khảo đơn vị nội thất nào chưa',                                                                                                   level: 1, wbs: '3.2', duration: 2,  weight: 1, color: '', parentIdx: 10 },
        { name: 'Ngân sách a/c dự kiến cho phần nội thất khoảng bao nhiêu',                                                                                             level: 1, wbs: '3.3', duration: 2,  weight: 1, color: '', parentIdx: 10 },
        { name: 'Từ đó sẽ phân loại KH: A là muốn làm ngay - B là khoảng 3 đến 5 tháng nữa mới làm - C là chỉ mang tính chất tham khảo chưa có ý định làm',          level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 10 },
        { name: 'Bước 4: Sau 5 đến 7 ngày sau',                                                                                                                          level: 0, wbs: '4',   duration: 1,  weight: 1, color: '#3b82f6', predIdx: 10 },
        { name: 'Hẹn đến nhà Khách hàng khảo sát công trình thực tế',                                                                                                   level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 15 },
        { name: 'Xin khách hàng bản vẽ kiến trúc – Thiết kế nội thất (nếu có)',                                                                                         level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 15 },
        { name: 'Sau khảo sát 2 ngày phải có định hướng phong cách cho khách hàng',                                                                                     level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 15 },
        { name: 'Bước 5: Chấm điểm đạt tiêu chuẩn chuyển sang khách ưu tiên',                                                                                          level: 0, wbs: '5',   duration: 1,  weight: 1, color: '#8b5cf6', predIdx: 15 },
        { name: 'Khách hàng có nhà đang thi công xây dựng thực tế = 20 đ',                                                                                              level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 19 },
        { name: 'KH có tương tác tốt, chuyển giao thiết kế bản vẽ = 15 đ',                                                                                             level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 19 },
        { name: 'KH có dự kiến ngân sách dành cho nội thất = 20 đ',                                                                                                     level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 19 },
        { name: 'Đã được KH cùng khảo sát và trao đổi ý tưởng = 15 đ',                                                                                                 level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 19 },
        { name: 'KH đã tham khảo giá thành của công ty = 15 đ',                                                                                                         level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 19 },
        { name: 'KH có dự kiến thời điểm thi công nội thất = 15 đ',                                                                                                     level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 19 },
        { name: 'Tổng hợp nếu đạt được 70 điểm trở lên thì chuyển sang KH ưu tiên',                                                                                    level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 19 },
        { name: 'Bước 6: Phân công chịu trách nhiệm',                                                                                                                   level: 0, wbs: '6',   duration: 1,  weight: 1, color: '#0891b2', predIdx: 19 },
        { name: 'Cường phụ trách Chăm sóc khách hàng',                                                                                                                  level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 27 },
        { name: 'Quỳnh phụ trách khách ưu tiên',                                                                                                                         level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 27 },
        { name: 'Hiền phụ trách khách hợp đồng',                                                                                                                         level: 1, wbs: '',     duration: 1,  weight: 1, color: '', parentIdx: 27 },
    ];
    await createTemplateItems(tpl.id, cpItems);
    seededCarePlan = true;
    console.log('[schedule-templates] Care plan template seeded');
}

export const GET = withAuth(async () => {
    // Auto-seed defaults if empty
    try { await ensureDefaultTemplates(); } catch (e) { console.error('Auto-seed failed:', e); }
    try { await ensureCarePlanTemplate(); } catch (e) { console.error('Care plan seed failed:', e); }

    const templates = await prisma.scheduleTemplate.findMany({
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { items, ...validated } = scheduleTemplateCreateSchema.parse(body);

    const template = await prisma.$transaction(async (tx) => {
        const tpl = await tx.scheduleTemplate.create({ data: validated });

        if (items && items.length > 0) {
            const idMap = new Map();
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const created = await tx.scheduleTemplateItem.create({
                    data: {
                        name: item.name,
                        order: item.order || i,
                        level: item.level || 0,
                        wbs: item.wbs || '',
                        duration: item.duration || 1,
                        weight: item.weight || 1,
                        color: item.color || '',
                        parentId: item.parentIndex != null ? (idMap.get(item.parentIndex) || null) : null,
                        predecessorId: item.predecessorIndex != null ? (idMap.get(item.predecessorIndex) || null) : null,
                        templateId: tpl.id,
                    },
                });
                idMap.set(i, created.id);
            }
        }

        return await tx.scheduleTemplate.findUnique({
            where: { id: tpl.id },
            include: { items: { orderBy: { order: 'asc' } } },
        });
    });

    return NextResponse.json(template, { status: 201 });
});
