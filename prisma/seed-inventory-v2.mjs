/**
 * Seed dữ liệu nền tảng cho Kho vật tư xưởng 2.0 — đơn vị tính, 14 nhóm vật tư (mục 3 spec),
 * và 1 kho mặc định. Idempotent (dùng upsert theo unique code) — chạy lại nhiều lần an toàn.
 * Run: node prisma/seed-inventory-v2.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const UNITS = [
    { code: 'cái', name: 'Cái' },
    { code: 'tấm', name: 'Tấm' },
    { code: 'cây', name: 'Cây' },
    { code: 'cuộn', name: 'Cuộn' },
    { code: 'mét', name: 'Mét' },
    { code: 'm2', name: 'Mét vuông' },
    { code: 'm3', name: 'Mét khối' },
    { code: 'hộp', name: 'Hộp' },
    { code: 'bịch', name: 'Bịch' },
    { code: 'bộ', name: 'Bộ' },
    { code: 'kg', name: 'Kilôgam' },
    { code: 'lít', name: 'Lít' },
    { code: 'thùng', name: 'Thùng' },
    { code: 'can', name: 'Can' },
];

const CATEGORIES = [
    { code: 'VCN', skuPrefix: 'VCN', name: 'Ván công nghiệp (MDF/HDF/plywood/ván nhựa)', order: 0 },
    { code: 'BM', skuPrefix: 'BM', name: 'Bề mặt (melamine/laminate/acrylic/veneer)', order: 1 },
    { code: 'NCC', skuPrefix: 'NCC', name: 'Nẹp và chỉ cạnh', order: 2 },
    { code: 'PK', skuPrefix: 'PK', name: 'Phụ kiện nội thất', order: 3 },
    { code: 'KK', skuPrefix: 'KK', name: 'Kim khí, vít, bu lông, ke góc', order: 4 },
    { code: 'KSC', skuPrefix: 'KSC', name: 'Keo, sơn, hóa chất, dung môi', order: 5 },
    { code: 'DDL', skuPrefix: 'DDL', name: 'Điện, đèn LED, nguồn, dây điện', order: 6 },
    { code: 'KDN', skuPrefix: 'KDN', name: 'Kính, đá, nhôm, inox', order: 7 },
    { code: 'VDG', skuPrefix: 'VDG', name: 'Vật tư đóng gói', order: 8 },
    { code: 'VTH', skuPrefix: 'VTH', name: 'Vật tư tiêu hao', order: 9 },
    { code: 'BTP', skuPrefix: 'BTP', name: 'Bán thành phẩm', order: 10 },
    { code: 'TP', skuPrefix: 'TP', name: 'Thành phẩm', order: 11 },
    { code: 'VTT', skuPrefix: 'VTT', name: 'Vật tư thừa còn sử dụng được', order: 12 },
    { code: 'PL', skuPrefix: 'PL', name: 'Phế liệu', order: 13 },
];

async function main() {
    console.log('🧩 Seeding InvUnit...');
    for (const u of UNITS) {
        await prisma.invUnit.upsert({ where: { code: u.code }, create: u, update: { name: u.name } });
    }

    console.log('🗂  Seeding InvMaterialCategory...');
    for (const c of CATEGORIES) {
        await prisma.invMaterialCategory.upsert({ where: { code: c.code }, create: c, update: { name: c.name, skuPrefix: c.skuPrefix, order: c.order } });
    }

    console.log('🏭 Seeding InvWarehouse mặc định...');
    const existing = await prisma.invWarehouse.findFirst();
    if (!existing) {
        await prisma.invWarehouse.create({ data: { code: 'KHO01', name: 'Kho Xưởng chính', type: 'Kho chính' } });
    }

    console.log('✅ Seed Kho 2.0 hoàn tất.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
