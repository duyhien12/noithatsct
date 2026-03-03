// Run: node scripts/rename-category.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RENAMES = [
    ['Nội thất thành phẩm', 'Nội thất'],
    ['Sơn & Keo', 'Sơn & Phụ kiện'],
];

async function main() {
    for (const [from, to] of RENAMES) {
        const result = await prisma.product.updateMany({
            where: { category: from },
            data: { category: to },
        });
        if (result.count > 0) {
            console.log(`✅ Đổi ${result.count} SP: "${from}" → "${to}"`);
        } else {
            console.log(`⏭️  Không có SP nào thuộc "${from}"`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
