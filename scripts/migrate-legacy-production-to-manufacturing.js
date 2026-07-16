// Chuyển dữ liệu từ hệ thống "Quản lý sản xuất" cũ (ProductionOrder/Floor/Room/Item)
// sang module "Sản xuất" mới (MfgOrder/MfgItem/MfgItemStage). Không xóa/sửa dữ liệu cũ —
// chỉ đọc và tạo thêm bản ghi mới. An toàn để chạy lại nhiều lần (bỏ qua lệnh đã chuyển).
// Run: node scripts/migrate-legacy-production-to-manufacturing.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MIGRATE_TAG = 'LEGACY_MIGRATED_FROM_PRODUCTION';

// 5 mốc cũ -> tên công đoạn mặc định tương ứng đã seed sẵn trong MfgStageTemplate
const STEP_STAGE_MAP = [
    { flag: 'stepCNC', at: 'stepCNCAt', by: 'stepCNCBy', stageName: 'Khoan CNC/khoan liên kết' },
    { flag: 'stepColdProcess', at: 'stepColdProcessAt', by: 'stepColdProcessBy', stageName: 'Cắt ván/gia công thô' },
    { flag: 'stepWorkshopAssembly', at: 'stepWorkshopAssemblyAt', by: 'stepWorkshopAssemblyBy', stageName: 'Lắp ráp thử' },
    { flag: 'stepTransport', at: 'stepTransportAt', by: 'stepTransportBy', stageName: 'Vận chuyển' },
    { flag: 'stepSiteInstall', at: 'stepSiteInstallAt', by: 'stepSiteInstallBy', stageName: 'Lắp đặt' },
];

function abbreviate(text, maxLen = 3) {
    if (!text) return 'SP';
    const normalized = text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').trim();
    const words = normalized.split(/\s+/).filter(Boolean);
    const abbr = words.map(w => w[0]).join('').toUpperCase();
    return (abbr || 'SP').slice(0, maxLen);
}

async function nextCode(table, prefix, padLength) {
    const records = await prisma.$queryRawUnsafe(`SELECT code FROM "${table}" WHERE code LIKE $1`, `${prefix}%`);
    const maxNum = records.map(r => r.code.slice(prefix.length)).filter(s => /^\d+$/.test(s)).reduce((m, s) => Math.max(m, Number(s)), 0);
    let candidate = maxNum + 1;
    const existing = new Set(records.map(r => r.code));
    while (existing.has(`${prefix}${String(candidate).padStart(padLength, '0')}`)) candidate++;
    return `${prefix}${String(candidate).padStart(padLength, '0')}`;
}

function itemStatusFromSteps(item) {
    if (item.stepSiteInstall) return { status: 'INSTALLED', progress: 100 };
    if (item.stepTransport) return { status: 'DELIVERED', progress: 90 };
    if (item.stepWorkshopAssembly) return { status: 'PACKED', progress: 70 };
    if (item.stepCNC || item.stepColdProcess) return { status: 'IN_PROGRESS', progress: 40 };
    return { status: 'NOT_STARTED', progress: 0 };
}

async function main() {
    const legacyOrders = await prisma.productionOrder.findMany({
        include: {
            project: { select: { id: true, code: true, name: true } },
            floors: { include: { rooms: { include: { items: true } } } },
        },
    });

    console.log(`Tìm thấy ${legacyOrders.length} lệnh sản xuất cũ.`);

    for (const legacy of legacyOrders) {
        const already = await prisma.mfgAuditLog.findFirst({ where: { action: MIGRATE_TAG, entityId: legacy.id } });
        if (already) { console.log(`⏭️  Bỏ qua ${legacy.project.code} — đã chuyển trước đó.`); continue; }

        const allItems = legacy.floors.flatMap(f => f.rooms.flatMap(r => r.items.map(it => ({ ...it, floorName: f.name, roomName: r.name }))));
        if (allItems.length === 0) { console.log(`⏭️  Bỏ qua ${legacy.project.code} — không có sản phẩm nào.`); continue; }

        const yymm = `${String(legacy.createdAt.getFullYear()).slice(2)}${String(legacy.createdAt.getMonth() + 1).padStart(2, '0')}`;
        const orderCode = await nextCode('MfgOrder', `LSX-${yymm}-`, 4);

        // Trạng thái tổng hợp: nếu tất cả sản phẩm đã lắp đặt -> COMPLETED, có sản phẩm đang làm -> IN_PRODUCTION, còn lại DRAFT
        const statuses = allItems.map(itemStatusFromSteps).map(s => s.status);
        let orderStatus = 'DRAFT';
        if (statuses.every(s => s === 'INSTALLED')) orderStatus = 'COMPLETED';
        else if (statuses.some(s => s !== 'NOT_STARTED')) orderStatus = 'IN_PRODUCTION';

        const stageTemplates = await prisma.mfgStageTemplate.findMany({ where: { name: { in: STEP_STAGE_MAP.map(s => s.stageName) } } });
        const stageTemplateByName = Object.fromEntries(stageTemplates.map(t => [t.name, t]));

        const order = await prisma.mfgOrder.create({
            data: {
                code: orderCode,
                projectId: legacy.projectId,
                title: `Sản xuất (chuyển từ hệ thống cũ) — ${legacy.project.name}`,
                status: orderStatus,
                progressPercent: Math.round(allItems.reduce((s, it) => s + itemStatusFromSteps(it).progress, 0) / allItems.length),
                approvedById: legacy.createdBy || '',
                approvedAt: orderStatus !== 'DRAFT' ? legacy.createdAt : null,
                actualStartDate: orderStatus !== 'DRAFT' ? legacy.createdAt : null,
                actualEndDate: orderStatus === 'COMPLETED' ? legacy.updatedAt : null,
                note: `${legacy.notes || ''}\n[Đã chuyển tự động từ Quản lý sản xuất (cũ), mã lệnh cũ: ${legacy.id}]`.trim(),
                createdById: legacy.createdBy || '',
                updatedById: legacy.createdBy || '',
                createdAt: legacy.createdAt,
            },
        });

        let itemSeq = 0;
        for (const legacyItem of allItems) {
            itemSeq++;
            const prefix = `${legacy.project.code}-SX-${abbreviate(legacyItem.name)}-`;
            const itemCode = await nextCode('MfgItem', prefix, 2);
            const { status, progress } = itemStatusFromSteps(legacyItem);

            const mfgItem = await prisma.mfgItem.create({
                data: {
                    code: itemCode,
                    mfgOrderId: order.id,
                    projectId: legacy.projectId,
                    name: legacyItem.name,
                    floorName: legacyItem.floorName,
                    roomName: legacyItem.roomName,
                    quantity: legacyItem.quantity,
                    status,
                    progressPercent: progress,
                    note: legacyItem.notes || '',
                    createdById: legacy.createdBy || '',
                    updatedById: legacy.createdBy || '',
                    createdAt: legacy.createdAt,
                },
            });

            let seq = 0;
            for (const step of STEP_STAGE_MAP) {
                seq += 10;
                const template = stageTemplateByName[step.stageName];
                const completed = !!legacyItem[step.flag];
                await prisma.mfgItemStage.create({
                    data: {
                        mfgItemId: mfgItem.id,
                        stageTemplateId: template?.id || null,
                        name: step.stageName,
                        sequence: seq,
                        status: completed ? 'COMPLETED' : 'NOT_STARTED',
                        progressPercent: completed ? 100 : 0,
                        actualEndDate: legacyItem[step.at] || null,
                        completedById: legacyItem[step.by] || '',
                        completedAt: legacyItem[step.at] || null,
                    },
                });
            }
        }

        await prisma.mfgAuditLog.create({
            data: {
                entityType: 'MfgOrder', entityId: legacy.id, action: MIGRATE_TAG,
                toStatus: orderStatus, byUserName: 'system-migration',
                note: `Chuyển từ ProductionOrder cũ (dự án ${legacy.project.code}) sang MfgOrder ${order.code} với ${allItems.length} sản phẩm.`,
            },
        });

        console.log(`✅ ${legacy.project.code}: tạo ${order.code} (${orderStatus}) với ${allItems.length} sản phẩm, ${itemSeq * 5} công đoạn.`);
    }

    console.log('Hoàn tất.');
}

main().catch(e => { console.error('MIGRATION FAILED:', e); process.exit(1); }).finally(() => prisma.$disconnect());
